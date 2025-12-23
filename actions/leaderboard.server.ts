'use server';

import { prisma } from '@/lib/prisma';
import { MatchStatus, TargetLanguage } from '@/generated/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    name: string;
    avatar: string | null;
    isBot: boolean;
    botModel: string | null;

    // Stats
    totalMatches: number;
    winRate: number;      // 0-100
    accuracy: number;     // 0-100
    avgSpeed: number;     // seconds

    // Rating score
    rating: number;
}

interface UserStats {
    userId: string;
    name: string;
    avatar: string | null;
    isBot: boolean;
    botModel: string | null;
    totalMatches: number;
    wins: number;
    correctAnswers: number;
    totalAnswers: number;
    totalResponseTimeMs: number;
    validSpeedCount: number;  // Count of non-timeout answers for speed calculation
    totalXp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rating Calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate leaderboard rating score
 * 
 * Formula:
 * - Win Rate (40%): wins/matches × 400
 * - Accuracy (30%): avgAccuracy × 3
 * - Speed (20%): max(0, 200 - avgResponseTime × 13.3) (15s = 0, 0s = 200)
 * - Activity (10%): min(100, totalXp / 100)
 */
function calculateRating(stats: {
    totalMatches: number;
    wins: number;
    avgAccuracy: number;
    avgResponseTime: number;
    totalXp: number;
}): number {
    const { totalMatches, wins, avgAccuracy, avgResponseTime, totalXp } = stats;

    if (totalMatches === 0) return 0;

    // Win rate (40%)
    const winRate = wins / totalMatches;
    const winScore = winRate * 400;

    // Accuracy (30%)
    const accuracyScore = avgAccuracy * 3;

    // Speed (20%) - 15秒得0分, 0秒得200分
    const speedScore = Math.max(0, 200 - (avgResponseTime * 13.33));

    // Activity (10%)
    const xpScore = Math.min(100, totalXp / 100);

    return Math.round(winScore + accuracyScore + speedScore + xpScore);
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get aggregated stats for all users (including bots)
 */
async function getAllUserStats(langFilter?: TargetLanguage): Promise<UserStats[]> {
    // 1. Get all users (include bots)
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            image: true,
            isBot: true,
            botModel: true,
        }
    });

    // 2. Get match stats per user
    const matchCondition = {
        status: MatchStatus.finished,
        ...(langFilter && { targetLanguage: langFilter }),
    };

    const userStats: UserStats[] = [];

    for (const user of users) {
        // Get matches where this user participated
        const matches = await prisma.match.findMany({
            where: {
                ...matchCondition,
                players: { some: { userId: user.id } }
            },
            select: {
                winnerId: true,
                isTie: true,
            }
        });

        if (matches.length === 0) continue; // Skip users with no matches

        const totalMatches = matches.length;
        const wins = matches.filter(m => m.winnerId === user.id).length;
        const ties = matches.filter(m => m.isTie).length;
        const losses = totalMatches - wins - ties;
        const totalXp = (wins * 100) + (ties * 50) + (losses * 20);

        // Get answer records for accuracy (all records) and speed (exclude timeouts)
        const answerRecords = await prisma.answerRecord.findMany({
            where: { userId: user.id },
            select: {
                isCorrect: true,
                responseTimeMs: true,
            }
        });

        const totalAnswers = answerRecords.length;
        const correctAnswers = answerRecords.filter(a => a.isCorrect).length;

        // Exclude timeout records (responseTimeMs = 0) from speed calculation
        const validSpeedRecords = answerRecords.filter(a => a.responseTimeMs > 0);
        const totalResponseTimeMs = validSpeedRecords.reduce((sum, a) => sum + a.responseTimeMs, 0);
        const validSpeedCount = validSpeedRecords.length;

        userStats.push({
            userId: user.id,
            name: user.name || 'Player',
            avatar: user.image,
            isBot: user.isBot,
            botModel: user.botModel,
            totalMatches,
            wins,
            correctAnswers,
            totalAnswers,
            totalResponseTimeMs,
            totalXp,
            validSpeedCount, // Add this for proper avg calculation
        });
    }

    return userStats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get leaderboard entries
 * Returns top 5 players sorted by rating
 */
export async function getLeaderboard(filter?: {
    lang?: TargetLanguage;
}): Promise<LeaderboardEntry[]> {
    const userStats = await getAllUserStats(filter?.lang);

    // Calculate entries with rating
    const entries: Omit<LeaderboardEntry, 'rank'>[] = userStats.map(stats => {
        const avgAccuracy = stats.totalAnswers > 0
            ? (stats.correctAnswers / stats.totalAnswers) * 100
            : 0;
        const avgResponseTime = stats.validSpeedCount > 0
            ? (stats.totalResponseTimeMs / stats.validSpeedCount) / 1000
            : 15; // default to max time if no valid answers

        const rating = calculateRating({
            totalMatches: stats.totalMatches,
            wins: stats.wins,
            avgAccuracy,
            avgResponseTime,
            totalXp: stats.totalXp,
        });

        return {
            userId: stats.userId,
            name: stats.name,
            avatar: stats.avatar,
            isBot: stats.isBot,
            botModel: stats.botModel,
            totalMatches: stats.totalMatches,
            winRate: stats.totalMatches > 0
                ? Math.round((stats.wins / stats.totalMatches) * 100)
                : 0,
            accuracy: Math.round(avgAccuracy),
            avgSpeed: Math.round(avgResponseTime * 10) / 10,
            rating,
        };
    });

    // Sort by rating descending, take top 5
    const sorted = entries.sort((a, b) => b.rating - a.rating).slice(0, 5);

    // Add rank
    return sorted.map((entry, index) => ({
        ...entry,
        rank: index + 1,
    }));
}
