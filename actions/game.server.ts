'use server';

import prisma from '@/lib/prisma';
import { TargetLanguage, MatchStatus, MatchMode } from '@/generated/prisma';
import type { GameSession, ClientQuestion, AnswerResult } from '@/types/game';

/** Simple hash function for answer validation */
function hashAnswer(answer: string): string {
    let hash = 0;
    for (let i = 0; i < answer.length; i++) {
        const char = answer.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
}

/**
 * Starts a new game session.
 */
export async function startGame(
    userId: string | null,
    config: { lang: TargetLanguage; rank: number; count?: number }
): Promise<GameSession> {
    // 1. Fetch all matching IDs for this config
    const allQuestionIds = await prisma.question.findMany({
        where: {
            targetLanguage: config.lang,
            rank: config.rank,
        },
        select: { id: true },
    });

    if (allQuestionIds.length === 0) {
        throw new Error(`No questions found in database for ${config.lang} rank ${config.rank}.`);
    }

    // 2. Determine how many questions to pick (default 10 if not provided)
    // If count > available, take all available
    const limit = config.count || 10;
    const questionCount = Math.min(allQuestionIds.length, limit);
    const shuffled = allQuestionIds.sort(() => 0.5 - Math.random());
    const selectedIds = shuffled.slice(0, questionCount).map((q) => q.id);

    // 3. Fetch the actual question data
    const questions = await prisma.question.findMany({
        where: {
            id: { in: selectedIds },
        },
    });

    // 4. Create Match
    const players = [
        {
            userId: userId,
            playerId: 'player_1',
            name: userId ? (await prisma.user.findUnique({ where: { id: userId } }))?.name || 'Guest' : 'Guest',
            isBot: false,
            finalScore: 0,
        },
        {
            userId: null,
            playerId: 'bot_1',
            name: 'RiceBot',
            isBot: true,
            botType: 'rule',
            finalScore: 0,
        },
    ];

    const match = await prisma.match.create({
        data: {
            mode: MatchMode.duel,
            targetLanguage: config.lang,
            rank: config.rank,
            questionCount: questionCount,
            timePerQuestion: 10,
            status: MatchStatus.playing,
            questionIds: selectedIds,
            players: players,
            startedAt: new Date(),
        },
    });

    // 5. Transform to ClientQuestion (filter out correctAnswer)
    const clientQuestions: ClientQuestion[] = questions.map((q) => ({
        id: q.id,
        stimulus: q.stimulus,
        options: q.interaction as Record<string, string>,
    }));

    // 6. Generate answer hashes for frontend validation
    const correctAnswerHashes: Record<string, string> = {};
    questions.forEach((q) => {
        correctAnswerHashes[q.id] = hashAnswer(q.correctAnswer);
    });

    // Ensure questions order matches selectedIds
    const orderedClientQuestions = selectedIds.map(id => clientQuestions.find(cq => cq.id === id)!);

    return {
        matchId: match.id,
        questions: orderedClientQuestions,
        correctAnswerHashes,
        players: match.players,
        targetLanguage: config.lang,
        rank: config.rank,
    };
}

/**
 * Submits an answer and returns the result.
 */
export async function submitAnswer(
    matchId: string,
    questionId: string,
    answer: string,
    userId: string | null,
    responseTimeMs: number = 500
): Promise<AnswerResult> {
    const question = await prisma.question.findUnique({
        where: { id: questionId },
    });

    if (!question) {
        throw new Error('Question not found');
    }

    const isCorrect = question.correctAnswer === answer;

    // Log answer record
    await prisma.answerRecord.create({
        data: {
            matchId,
            questionId,
            userId,
            answer,
            isCorrect,
            responseTimeMs,
        },
    });

    return {
        isCorrect,
        correctAnswer: question.correctAnswer,
        newScore: isCorrect ? 10 : 0, // Delta score
        isGameOver: false,
    };
}


/**
 * Batch submit all answers at game end.
 */
export async function submitAllAnswers(
    matchId: string,
    answers: { questionId: string; answer: string; responseTimeMs: number; isCorrect: boolean; playerId: string }[]
): Promise<{ success: boolean }> {
    if (!matchId || answers.length === 0) {
        return { success: false };
    }

    try {
        // 1. Fetch match to identify players and questions
        const match = await prisma.match.findUnique({
            where: { id: matchId },
        });

        if (!match) {
            throw new Error('Match not found');
        }

        // 2. Fetch questions for validation (ensure calculating real score)
        const questions = await prisma.question.findMany({
            where: { id: { in: match.questionIds } },
        });

        // Map for quick lookup
        const questionMap = new Map(questions.map(q => [q.id, q]));

        // 3. Calculate Scores
        const playerScores: Record<string, number> = {};

        // Initialize scores for all players in match
        match.players.forEach(p => {
            playerScores[p.playerId] = 0;
        });

        // Create answer records and calculate score
        const answerRecordsData = answers.map(a => {
            const question = questionMap.get(a.questionId);
            // Verify correctness on server side if possible, otherwise trust the payload for now 
            // (ideally should re-verify but for Bot logic we trust the client simulation for now)
            // For human player, we should strictly verify.

            let isReallyCorrect = a.isCorrect;

            // If we have the question, double check correctness
            if (question) {
                isReallyCorrect = question.correctAnswer === a.answer;
            }

            // Update score
            if (isReallyCorrect) {
                if (playerScores[a.playerId] !== undefined) {
                    playerScores[a.playerId] += 10;
                }
            }

            return {
                matchId,
                questionId: a.questionId,
                userId: a.playerId === 'player_1' ? match.players.find(p => p.playerId === 'player_1')?.userId : null,
                answer: a.answer,
                isCorrect: isReallyCorrect,
                responseTimeMs: a.responseTimeMs,
            };
        });

        // 4. Save Answer Records
        await prisma.answerRecord.createMany({
            data: answerRecordsData,
        });

        // 5. Update Match (Final Score & Winner)
        const updatedPlayers = match.players.map(p => ({
            ...p,
            finalScore: playerScores[p.playerId] || 0
        }));

        // Determine winner
        let winnerId: string | null = null;
        // Simple logic: higher score wins. If tie, no winner (or handle tie later)
        const p1 = updatedPlayers.find(p => p.playerId === 'player_1');
        const p2 = updatedPlayers.find(p => p.playerId !== 'player_1');

        if (p1 && p2) {
            if (p1.finalScore > p2.finalScore) {
                // If p1 is human (has userId), winnerId is the user ID. 
                // But schema says winnerId is @db.ObjectId, which usually implies User ID.
                // However, for Bot battles, bot doesn't have User ID.
                // Let's check schema: winnerId String? @db.ObjectId.
                // If it's a User ID, we can only set it if the winner is a User.
                if (p1.userId) {
                    winnerId = p1.userId;
                }
                // If p1 is bot (unlikely for player_1), winnerId remains null? 
                // Or maybe we verify if winnerId matches a User ID.
                // For now, only set winnerId if it's a real user.
            } else if (p2.finalScore > p1.finalScore) {
                if (p2.userId) {
                    winnerId = p2.userId;
                }
            }
        }

        await prisma.match.update({
            where: { id: matchId },
            data: {
                status: MatchStatus.finished,
                players: updatedPlayers,
                winnerId: winnerId,
                endedAt: new Date(),
            },
        });

        return { success: true };
    } catch (err) {
        console.error('Batch submit failed:', err);
        return { success: false };
    }
}

/**
 * Result type for initializing a game
 */
export type GameInitResult =
    | { error: string }
    | GameSession;

/**
 * Get an existing match by ID.
 * Used by Battle page to load a match created in WaitingRoom.
 */
export async function getMatch(matchId: string): Promise<GameInitResult> {
    const match = await prisma.match.findUnique({
        where: { id: matchId },
    });

    if (!match) {
        return { error: 'Match not found' };
    }

    // Check if match is finished
    if (match.status === MatchStatus.finished) {
        return { error: 'MATCH_FINISHED' };
    }

    // Check if match is expired (created more than 1 hour ago)
    const ONE_HOUR_MS = 60 * 60 * 1000;
    if (Date.now() - match.createdAt.getTime() > ONE_HOUR_MS) {
        return { error: 'MATCH_EXPIRED' };
    }

    // Fetch questions
    const questions = await prisma.question.findMany({
        where: { id: { in: match.questionIds } },
    });

    // Transform to ClientQuestion
    const clientQuestions: ClientQuestion[] = questions.map((q) => ({
        id: q.id,
        stimulus: q.stimulus,
        options: q.interaction as Record<string, string>,
    }));

    // Generate answer hashes
    const correctAnswerHashes: Record<string, string> = {};
    questions.forEach((q) => {
        correctAnswerHashes[q.id] = hashAnswer(q.correctAnswer);
    });

    // Ensure order matches questionIds
    const orderedClientQuestions = match.questionIds.map(id =>
        clientQuestions.find(cq => cq.id === id)!
    );

    return {
        matchId: match.id,
        questions: orderedClientQuestions,
        correctAnswerHashes,
        players: match.players as any,
        targetLanguage: match.targetLanguage,
        rank: match.rank,
    };
}

/**
 * Create a match and return the matchId only.
 * Used by WaitingRoom before navigating to Battle.
 */
export async function createMatch(
    userId: string | null,
    config: { lang: TargetLanguage; rank: number; count?: number }
): Promise<{ matchId: string }> {
    // Fetch question IDs
    const allQuestionIds = await prisma.question.findMany({
        where: {
            targetLanguage: config.lang,
            rank: config.rank,
        },
        select: { id: true },
    });

    if (allQuestionIds.length === 0) {
        throw new Error(`No questions found for ${config.lang} rank ${config.rank}.`);
    }

    const limit = config.count || 10;
    const questionCount = Math.min(allQuestionIds.length, limit);
    const shuffled = allQuestionIds.sort(() => 0.5 - Math.random());
    const selectedIds = shuffled.slice(0, questionCount).map((q) => q.id);

    // Setup players
    const players = [
        {
            userId: userId,
            playerId: 'player_1',
            name: userId ? (await prisma.user.findUnique({ where: { id: userId } }))?.name || 'Guest' : 'Guest',
            isBot: false,
            finalScore: 0,
        },
        {
            userId: null,
            playerId: 'bot_1',
            name: 'RiceBot',
            isBot: true,
            botType: 'rule',
            finalScore: 0,
        },
    ];

    // Create match
    const match = await prisma.match.create({
        data: {
            mode: MatchMode.duel,
            targetLanguage: config.lang,
            rank: config.rank,
            questionCount: questionCount,
            timePerQuestion: 10,
            status: MatchStatus.playing,
            questionIds: selectedIds,
            players: players,
            startedAt: new Date(),
        },
    });

    return { matchId: match.id };
}
