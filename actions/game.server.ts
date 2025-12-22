'use server';

import { prisma } from '@/lib/prisma';
import { TargetLanguage, MatchStatus, MatchMode } from '@/generated/prisma';
import type { GameSession, ClientQuestion } from '@/types/game';
import type { LiveGameState } from '@/lib/game-engine/server/GameStore';
import type { MatchPlayer } from '@/generated/prisma';

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



// NOTE: submitAnswer and submitAllAnswers have been REMOVED
// Game answer submission is now handled by:
// - lib/game-engine/server/GameRoom.ts -> submitAnswer (with transaction)
// - lib/game-engine/server/GameRoom.ts -> finishGame (writes UserStats)

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
        players: match.players as MatchPlayer[],
        targetLanguage: match.targetLanguage,
        rank: match.rank,
    };
}

/**
 * Get available bot users for selection
 */
export interface BotUserInfo {
    id: string;
    name: string;
    botModel: string | null;
    image: string | null;
}

export async function getBotUsers(): Promise<BotUserInfo[]> {
    const bots = await prisma.user.findMany({
        where: { isBot: true },
        select: {
            id: true,
            name: true,
            botModel: true,
            image: true,
        },
        orderBy: { createdAt: 'asc' },
    });

    return bots.map(bot => ({
        id: bot.id,
        name: bot.name || 'Bot',
        botModel: bot.botModel,
        image: bot.image,
    }));
}

/**
 * Create a match and return the matchId only.
 * Used by WaitingRoom before navigating to Battle.
 */
export async function createMatch(
    userId: string | null,
    config: { lang: TargetLanguage; rank: number; count?: number },
    botUserId?: string // Optional: specific bot to play against
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

    // Fetch bot user if botUserId provided, otherwise use first available bot
    let botName = 'RiceBot';
    let botAvatar: string | null = null;
    let botModel: string | null = 'rule';
    let actualBotUserId: string | null = null;

    if (botUserId) {
        const botUser = await prisma.user.findUnique({
            where: { id: botUserId },
            select: { id: true, name: true, image: true, botModel: true }
        });
        if (botUser) {
            actualBotUserId = botUser.id;
            botName = botUser.name || 'Bot';
            botAvatar = botUser.image;
            botModel = botUser.botModel || 'llm';
        }
    } else {
        // Fallback: get a random bot
        const randomBot = await prisma.user.findFirst({
            where: { isBot: true },
            select: { id: true, name: true, image: true, botModel: true }
        });
        if (randomBot) {
            actualBotUserId = randomBot.id;
            botName = randomBot.name || 'Bot';
            botAvatar = randomBot.image;
            botModel = randomBot.botModel || 'llm';
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
            userId: actualBotUserId,
            playerId: 'bot_1',
            name: botName,
            avatar: botAvatar,
            isBot: true,
            botType: 'llm',
            botModel: botModel,
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



// ============================================
// Server-Authoritative Game Room Actions
// ============================================

import {
    initGameRoom as initRoom,
    startRound as startGameRound,
    submitAnswer as submitGameRoomAnswer,
    handleTimeout as handleGameTimeout,
} from '@/lib/game-engine/server/GameRoom';
import { getGameState } from '@/lib/game-engine/server/GameStore';

/**
 * Initialize and start a game room
 */
export async function initAndStartGameRoom(matchId: string) {
    try {
        // Initialize room
        await initRoom(matchId);

        // Start first round
        const state = await startGameRound(matchId);

        return { success: true, state };
    } catch (error) {
        console.error('initAndStartGameRoom error:', error);
        return { success: false, error: (error as Error).message };
    }
}



/**
 * Submit an answer (server validates and scores)
 */
export async function submitServerAnswer(
    matchId: string,
    playerId: string,
    answer: string
) {
    try {
        const state = await submitGameRoomAnswer(matchId, playerId, answer);
        return { success: true, state };
    } catch (error) {
        console.error('submitServerAnswer error:', error);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Report timeout (client calls when endTime is reached)
 */
export async function reportTimeout(matchId: string) {
    try {
        const state = await handleGameTimeout(matchId);
        return { success: true, state };
    } catch (error) {
        console.error('reportTimeout error:', error);
        return { success: false, error: (error as Error).message };
    }
}

// ============================================
// Match Result (for results page)
// ============================================

import { rankToLevel } from '@/lib/config/game';
import type { GameResult, PlayerResult } from '@/types/game';

/**
 * Get match result for display on results page
 * Returns null if match not found or not finished
 */
export async function getMatchResult(
    matchId: string,
    selfPlayerId: string = 'player_1'
): Promise<GameResult | null> {
    try {
        const match = await prisma.match.findUnique({
            where: { id: matchId },
            select: {
                id: true,
                status: true,
                targetLanguage: true,
                rank: true,
                liveState: true,
                questionCount: true,
                players: true,
            },
        });

        if (!match || match.status !== 'finished') {
            return null;
        }

        // Find self and opponent
        const selfPlayer = match.players.find(p => p.playerId === selfPlayerId);
        const opponentPlayer = match.players.find(p => p.playerId !== selfPlayerId);

        if (!selfPlayer || !opponentPlayer) {
            return null;
        }

        const totalQuestions = match.questionCount;
        const liveState = match.liveState as unknown as LiveGameState | null;

        // Calculate stats
        const createPlayerResult = (player: typeof selfPlayer): PlayerResult => {
            const correctAnswers = Math.floor(player.finalScore / 10);

            // Retrieve maxStreak from liveState if available
            let maxStreak = 0;
            if (liveState && liveState.playerStates && liveState.playerStates[player.playerId]) {
                maxStreak = liveState.playerStates[player.playerId].maxStreak || 0;
            }

            return {
                id: player.playerId,
                name: player.name,
                score: player.finalScore,
                avatar: player.avatar,
                isBot: player.isBot,
                correctAnswers,
                accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
                maxStreak,
            };
        };

        // Determine outcome
        let outcome: 'win' | 'lose' | 'tie';
        if (selfPlayer.finalScore > opponentPlayer.finalScore) {
            outcome = 'win';
        } else if (selfPlayer.finalScore < opponentPlayer.finalScore) {
            outcome = 'lose';
        } else {
            outcome = 'tie';
        }

        return {
            matchId: match.id,
            outcome,
            self: createPlayerResult(selfPlayer),
            opponent: createPlayerResult(opponentPlayer),
            match: {
                totalQuestions,
                language: match.targetLanguage,
                level: rankToLevel(match.targetLanguage, match.rank),
            },
        };
    } catch (error) {
        console.error('getMatchResult error:', error);
        return null;
    }
}
