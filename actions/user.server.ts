'use server';

import { prisma } from '@/lib/prisma';
import { TargetLanguage, MatchStatus } from '@/generated/prisma';

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
            isWin: !match.isTie && match.winnerId === userId,
            isTie: match.isTie,
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
