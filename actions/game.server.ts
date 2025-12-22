'use server';

import { prisma } from '@/lib/prisma';
import { TargetLanguage, MatchStatus, MatchMode } from '@/generated/prisma';
import type { GameSession, ClientQuestion } from '@/types/game';

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
): Promise<{ isCorrect: boolean; correctAnswer: string; newScore: number; isGameOver: boolean }> {
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

        // Determine winner & stats
        let winnerId: string | null = null;
        const p1 = updatedPlayers.find(p => p.playerId === 'player_1');
        const p2 = updatedPlayers.find(p => p.playerId !== 'player_1');

        if (p1 && p2) {
            if (p1.finalScore > p2.finalScore) {
                // P1 Wins
                if (p1.userId) winnerId = p1.userId;
            } else if (p2.finalScore > p1.finalScore) {
                // P2 Wins
                if (p2.userId) winnerId = p2.userId;
            } else {
                // Tie (winnerId remains null)
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

        // 6. Update User Stats (Persistence)
        // Only update stats for real users
        const realPlayers = updatedPlayers.filter(p => !p.isBot && p.userId);

        for (const player of realPlayers) {
            if (!player.userId) continue;

            const isWin = winnerId === player.userId;
            const isTie = winnerId === null;
            const isLoss = !isWin && !isTie;

            // Calculate XP
            let xpGained = 0;
            if (isWin) xpGained = 100;
            else if (isTie) xpGained = 50;
            else if (isLoss) xpGained = 20;

            // Update User Stats Atomically
            // Update User Stats (Fetch-Compute-Set pattern for safety with MongoDB Embedded types)
            const currentUser = await prisma.user.findUnique({
                where: { id: player.userId },
                select: { stats: true }
            });

            const currentStats = currentUser?.stats || {
                totalMatches: 0,
                wins: 0,
                losses: 0,
                ties: 0,
                correctRate: 0,
                totalXp: 0
            };

            await prisma.user.update({
                where: { id: player.userId },
                data: {
                    stats: {
                        set: {
                            totalMatches: currentStats.totalMatches + 1,
                            wins: currentStats.wins + (isWin ? 1 : 0),
                            losses: currentStats.losses + (isLoss ? 1 : 0),
                            ties: currentStats.ties + (isTie ? 1 : 0),
                            correctRate: currentStats.correctRate, // TODO: Update logic if needed
                            totalXp: currentStats.totalXp + xpGained
                        }
                    }
                }
            });
        }

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

    // Setup players - fetch real user data if userId provided
    let playerName = 'Guest';
    let playerAvatar: string | null = null;

    if (userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, image: true }
        });
        if (user) {
            playerName = user.name || 'Player';
            playerAvatar = user.image;
        }
    }

    const players = [
        {
            userId: userId,
            playerId: 'player_1',
            name: playerName,
            avatar: playerAvatar,
            isBot: false,
            finalScore: 0,
        },
        {
            userId: null,
            playerId: 'bot_1',
            name: 'RiceBot',
            avatar: null,
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

/**
 * Match history item for list display
 */
export interface MatchHistoryItem {
    id: string;
    date: string;
    language: TargetLanguage;
    rank: number;
    playerScore: number;
    opponentScore: number;
    isWin: boolean;
    isTie: boolean;
    opponentName: string;
}

/**
 * Get user's match history
 */
export async function getUserMatchHistory(userId: string): Promise<MatchHistoryItem[]> {
    const matches = await prisma.match.findMany({
        where: {
            status: MatchStatus.finished,
            players: {
                some: {
                    userId: userId
                }
            }
        },
        orderBy: {
            endedAt: 'desc'
        },
        take: 20, // Limit to recent 20 matches
    });

    return matches.map(match => {
        const userPlayer = match.players.find(p => p.userId === userId);
        const opponent = match.players.find(p => p.userId !== userId);

        return {
            id: match.id,
            date: match.endedAt?.toISOString().split('T')[0] || match.createdAt.toISOString().split('T')[0],
            language: match.targetLanguage,
            rank: match.rank,
            playerScore: userPlayer?.finalScore || 0,
            opponentScore: opponent?.finalScore || 0,
            isWin: match.winnerId === userId,
            isTie: match.winnerId === null,
            opponentName: opponent?.name || 'Unknown',
        };
    });
}

/**
 * Match detail for record detail page
 */
export interface MatchDetail {
    id: string;
    date: string;
    language: TargetLanguage;
    rank: number;
    playerScore: number;
    opponentScore: number;
    isWin: boolean;
    isTie: boolean;
    playerName: string;
    opponentName: string;
    totalQuestions: number;
    correctAnswers: number;
    questions: {
        id: string;
        stimulus: string;
        options: Record<string, string>;
        playerAnswer: string | null;
        correctAnswer: string;
        isCorrect: boolean;
    }[];
}

/**
 * Get match detail by ID
 */
export async function getMatchDetail(matchId: string, userId: string): Promise<MatchDetail | null> {
    const match = await prisma.match.findUnique({
        where: { id: matchId },
    });

    if (!match) return null;

    // Fetch questions
    const questions = await prisma.question.findMany({
        where: { id: { in: match.questionIds } },
    });

    // Fetch user's answer records for this match
    const answerRecords = await prisma.answerRecord.findMany({
        where: {
            matchId: matchId,
            userId: userId,
        },
    });

    const answerMap = new Map(answerRecords.map(a => [a.questionId, a]));
    const userPlayer = match.players.find(p => p.userId === userId);
    const opponent = match.players.find(p => p.userId !== userId);

    const questionsWithAnswers = match.questionIds.map(qId => {
        const question = questions.find(q => q.id === qId);
        const answer = answerMap.get(qId);

        return {
            id: qId,
            stimulus: question?.stimulus || '',
            options: (question?.interaction as Record<string, string>) || {},
            playerAnswer: answer?.answer || null,
            correctAnswer: question?.correctAnswer || '',
            isCorrect: answer?.isCorrect || false,
        };
    });

    const correctAnswers = questionsWithAnswers.filter(q => q.isCorrect).length;

    return {
        id: match.id,
        date: match.endedAt?.toISOString().split('T')[0] || match.createdAt.toISOString().split('T')[0],
        language: match.targetLanguage,
        rank: match.rank,
        playerScore: userPlayer?.finalScore || 0,
        opponentScore: opponent?.finalScore || 0,
        isWin: match.winnerId === userId,
        isTie: match.winnerId === null,
        playerName: userPlayer?.name || 'You',
        opponentName: opponent?.name || 'Opponent',
        totalQuestions: match.questionCount,
        correctAnswers,
        questions: questionsWithAnswers,
    };
}

/**
 * Dashboard Statistics Interface
 */
export interface UserDashboardStats {
    totalMatches: number;
    winRate: number;
    currentStreak: number;
    lastMatch: MatchHistoryItem | null;
    level: number;
    exp: number;
    avgSpeed: number;
}

/**
 * Get aggregated stats for the user dashboard
 */
export async function getUserDashboardStats(userId: string): Promise<UserDashboardStats> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stats: true }
    });

    const stats = user?.stats;

    // 1. Basic Stats (from DB or fallback)
    let totalMatches = stats?.totalMatches || 0;
    let totalWins = stats?.wins || 0;
    let totalXp = stats?.totalXp || 0;

    // If no stored stats, fallback to calculation (backward compatibility)
    if (!stats) {
        totalMatches = await prisma.match.count({
            where: {
                status: MatchStatus.finished,
                players: { some: { userId: userId } }
            }
        });
        totalWins = await prisma.match.count({
            where: {
                status: MatchStatus.finished,
                winnerId: userId
            }
        });
        // Approx XP for legacy: 50 per match
        totalXp = totalMatches * 50;
    }

    // 2. Win Rate
    const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

    // 3. Level Calculation
    // Level 1 = 0-99 XP
    // Level 2 = 100-199 XP
    const level = Math.floor(totalXp / 100) + 1;

    // 4. Streak & Last Match (Still need match history)
    const matches = await prisma.match.findMany({
        where: {
            status: MatchStatus.finished,
            players: { some: { userId: userId } }
        },
        orderBy: { endedAt: 'desc' },
        take: 20
    });

    let currentStreak = 0;
    for (const m of matches) {
        if (m.winnerId === userId) {
            currentStreak++;
        } else {
            break;
        }
    }

    let lastMatch: MatchHistoryItem | null = null;
    if (matches.length > 0) {
        const m = matches[0];
        const userPlayer = m.players.find(p => p.userId === userId);
        const opponent = m.players.find(p => p.userId !== userId);

        lastMatch = {
            id: m.id,
            date: m.endedAt?.toISOString().split('T')[0] || m.createdAt.toISOString().split('T')[0],
            language: m.targetLanguage,
            rank: m.rank,
            playerScore: userPlayer?.finalScore || 0,
            opponentScore: opponent?.finalScore || 0,
            isWin: m.winnerId === userId,
            isTie: m.winnerId === null,
            opponentName: opponent?.name || 'Unknown',
        };
    }

    // 5. Calculate Average Speed (from last 50 answers)
    const recentAnswers = await prisma.answerRecord.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { responseTimeMs: true }
    });

    let avgSpeed = 0;
    if (recentAnswers.length > 0) {
        const totalTime = recentAnswers.reduce((sum, record) => sum + record.responseTimeMs, 0);
        const avgMs = totalTime / recentAnswers.length;
        // Convert to seconds, rounded to 1 decimal
        avgSpeed = Math.round((avgMs / 1000) * 10) / 10;
    }

    return {
        totalMatches,
        winRate,
        currentStreak,
        lastMatch,
        level,
        exp: totalXp,
        avgSpeed
    };
}
