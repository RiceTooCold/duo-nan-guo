'use server';

import prisma from '@/lib/prisma';
import { TargetLanguage, MatchStatus, MatchMode } from '@/generated/prisma';
import type { GameSession, ClientQuestion, AnswerResult } from '@/types/game';

/**
 * Starts a new game session.
 */
export async function startGame(
    userId: string | null,
    config: { lang: TargetLanguage; rank: number }
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

    // 2. Determine how many questions to pick (max 10)
    const questionCount = Math.min(allQuestionIds.length, 10);
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

    // Ensure questions order matches selectedIds
    const orderedClientQuestions = selectedIds.map(id => clientQuestions.find(cq => cq.id === id)!);

    return {
        matchId: match.id,
        questions: orderedClientQuestions,
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
        newHealth: isCorrect ? 0 : -10, // Delta health
        isGameOver: false,
    };
}

/**
 * Creates a match for a guest user.
 */
export async function createGuestMatch(
    lang: TargetLanguage,
    rank: number,
    mode: 'SOLO' | 'BOT'
): Promise<GameSession> {
    // 1. Fetch available question IDs
    const allQuestionIds = await prisma.question.findMany({
        where: { targetLanguage: lang, rank: rank },
        select: { id: true },
    });

    if (allQuestionIds.length === 0) {
        throw new Error(`No questions found for ${lang} rank ${rank} in database.`);
    }

    const questionCount = Math.min(allQuestionIds.length, 10);
    const shuffled = allQuestionIds.sort(() => 0.5 - Math.random());
    const selectedIds = shuffled.slice(0, questionCount).map((q) => q.id);

    const questions = await prisma.question.findMany({
        where: { id: { in: selectedIds } },
    });

    // 2. Setup Players
    const players: any[] = [
        {
            userId: null,
            playerId: 'player_1',
            name: 'Guest',
            isBot: false,
            finalScore: 0,
        },
    ];

    if (mode === 'BOT') {
        players.push({
            userId: null,
            playerId: 'bot_1',
            name: 'RiceBot',
            isBot: true,
            botType: 'rule',
            finalScore: 0,
        });
    }

    // 3. Create Match
    const match = await prisma.match.create({
        data: {
            mode: MatchMode.duel,
            targetLanguage: lang,
            rank: rank,
            questionCount: questionCount,
            timePerQuestion: 10,
            status: MatchStatus.playing,
            questionIds: selectedIds,
            players: players,
            startedAt: new Date(),
        },
    });

    // 4. Transform
    const clientQuestions: ClientQuestion[] = questions.map((q) => ({
        id: q.id,
        stimulus: q.stimulus,
        options: q.interaction as Record<string, string>,
    }));

    const orderedClientQuestions = selectedIds.map(id => clientQuestions.find(cq => cq.id === id)!);

    return {
        matchId: match.id,
        questions: orderedClientQuestions,
        players: match.players,
        targetLanguage: lang,
        rank: rank,
    };
}
