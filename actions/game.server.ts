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

    // Check if match is cancelled or abandoned
    if (match.status === MatchStatus.cancelled) {
        return { error: 'MATCH_CANCELLED' };
    }
    if (match.status === MatchStatus.abandoned) {
        return { error: 'MATCH_ABANDONED' };
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
 * Returns the latest state (handles both new games and reconnecting players)
 */
export async function initAndStartGameRoom(matchId: string) {
    try {
        // Initialize room (idempotent - returns existing state if already playing)
        await initRoom(matchId);

        // Start first round (idempotent - skips if already PLAYING)
        await startGameRound(matchId);

        // Always fetch the LATEST state to return
        // This ensures reconnecting players get the current game state
        const latestState = await getGameState(matchId);

        if (!latestState) {
            return { success: false, error: 'Failed to get game state' };
        }

        return { success: true, state: latestState };
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
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';

/**
 * Get match result for display on results page
 * Uses server session to automatically determine which player is viewing
 * Returns null if match not found or not finished
 */
export async function getMatchResult(matchId: string): Promise<GameResult | null> {
    try {
        // Get current user from server session
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

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

        // Fetch AnswerRecords for all players in this match
        const answerRecords = await prisma.answerRecord.findMany({
            where: { matchId },
            select: {
                userId: true,
                responseTimeMs: true,
            },
        });

        // Group response times by userId
        const responseTimesByUser = new Map<string, number[]>();
        for (const record of answerRecords) {
            if (!record.userId) continue; // Skip if userId is null
            const times = responseTimesByUser.get(record.userId) || [];
            times.push(record.responseTimeMs);
            responseTimesByUser.set(record.userId, times);
        }

        // Find self player based on session userId, fallback to player_1 for logged-out users
        let selfPlayer = match.players.find(p => p.userId === userId);
        if (!selfPlayer) {
            // Fallback: if no session or user not in match (e.g. spectator), use player_1
            selfPlayer = match.players.find(p => p.playerId === 'player_1');
        }
        const opponentPlayer = match.players.find(p => p.playerId !== selfPlayer?.playerId);

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

            // Calculate average response time
            const responseTimes = player.userId ? responseTimesByUser.get(player.userId) || [] : [];
            const avgResponseTimeMs = responseTimes.length > 0
                ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
                : 0;
            const avgResponseTime = Math.round(avgResponseTimeMs / 100) / 10; // Convert to seconds with 1 decimal

            return {
                id: player.playerId,
                name: player.name,
                score: player.finalScore,
                avatar: player.avatar,
                isBot: player.isBot,
                correctAnswers,
                accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
                maxStreak,
                avgResponseTime,
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

// ============================================
// Room System Functions (for unified waiting room)
// ============================================

import { pusherServer, getRoomChannel, ROOM_EVENTS } from '@/lib/pusher';

/**
 * Info about a waiting match (for room list)
 */
export interface WaitingMatchInfo {
    id: string;
    targetLanguage: TargetLanguage;
    rank: number;
    questionCount: number;
    hostName: string;
    hostAvatar: string | null;
    createdAt: Date;
}

/**
 * Create a waiting match (acts as "room")
 * For Bot mode: botId is required, bot added immediately
 * For PvP mode: botId is null, second player joins later
 */
export async function createWaitingMatch(
    userId: string,
    config: {
        targetLanguage: TargetLanguage;
        rank: number;
        questionCount: number;
        isBot: boolean;
        botId?: string;
    }
): Promise<{ matchId: string }> {
    // 1. Fetch questions
    const allQuestionIds = await prisma.question.findMany({
        where: {
            targetLanguage: config.targetLanguage,
            rank: config.rank,
        },
        select: { id: true },
    });

    if (allQuestionIds.length === 0) {
        throw new Error(`No questions found for ${config.targetLanguage} rank ${config.rank}.`);
    }

    const questionCount = Math.min(allQuestionIds.length, config.questionCount);
    const shuffled = allQuestionIds.sort(() => 0.5 - Math.random());
    const selectedIds = shuffled.slice(0, questionCount).map((q) => q.id);

    // 2. Get host user info
    const hostUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, image: true }
    });

    const players: MatchPlayer[] = [
        {
            userId: userId,
            playerId: 'player_1',
            name: hostUser?.name || 'Player',
            avatar: hostUser?.image || null,
            isBot: false,
            botModel: null,
            finalScore: 0,
        },
    ];

    // 3. If bot mode, add bot as player_2
    if (config.isBot && config.botId) {
        const botUser = await prisma.user.findUnique({
            where: { id: config.botId },
            select: { id: true, name: true, image: true, botModel: true }
        });
        if (botUser) {
            players.push({
                userId: botUser.id,
                playerId: 'player_2',
                name: botUser.name || 'Bot',
                avatar: botUser.image,
                isBot: true,
                botModel: botUser.botModel,
                finalScore: 0,
            });
        }
    }

    // 4. Create match with 'waiting' status
    const match = await prisma.match.create({
        data: {
            mode: MatchMode.duel,
            targetLanguage: config.targetLanguage,
            rank: config.rank,
            questionCount: questionCount,
            timePerQuestion: 10,
            status: MatchStatus.waiting,
            questionIds: selectedIds,
            players: players,
        },
    });

    return { matchId: match.id };
}

/**
 * Get list of waiting PvP matches (for /join page)
 */
export async function getWaitingMatches(filter?: {
    targetLanguage?: TargetLanguage;
}): Promise<WaitingMatchInfo[]> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const matches = await prisma.match.findMany({
        where: {
            status: MatchStatus.waiting,
            createdAt: { gt: tenMinutesAgo },
            ...(filter?.targetLanguage && { targetLanguage: filter.targetLanguage }),
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
    });

    // Filter to only matches with 1 player (waiting for guest)
    const waitingMatches = matches.filter(m => m.players.length === 1);

    return waitingMatches.map(m => ({
        id: m.id,
        targetLanguage: m.targetLanguage,
        rank: m.rank,
        questionCount: m.questionCount,
        hostName: m.players[0]?.name || 'Player',
        hostAvatar: m.players[0]?.avatar || null,
        createdAt: m.createdAt,
    }));
}

/**
 * Join a waiting match as player_2
 * Uses transaction to prevent concurrent join race condition
 */
export async function joinWaitingMatch(
    matchId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Use transaction for atomic read-check-update
        const result = await prisma.$transaction(async (tx) => {
            // 1. Get match and validate (within transaction)
            const match = await tx.match.findUnique({
                where: { id: matchId },
            });

            if (!match) {
                return { success: false, error: 'Match not found' };
            }

            if (match.status !== MatchStatus.waiting) {
                return { success: false, error: 'Match is no longer waiting' };
            }

            if (match.players.length >= 2) {
                return { success: false, error: 'Match is full' };
            }

            // 2. Get joining user info
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { name: true, image: true }
            });

            const newPlayer = {
                userId: userId,
                playerId: 'player_2',
                name: user?.name || 'Player',
                avatar: user?.image || null,
                isBot: false,
                finalScore: 0,
            };

            // 3. Add player to match (atomic within transaction)
            await tx.match.update({
                where: { id: matchId },
                data: {
                    players: [...match.players, newPlayer],
                },
            });

            return { success: true, player: newPlayer };
        });

        if (!result.success) {
            return { success: false, error: result.error };
        }

        // 4. Broadcast player joined (outside transaction)
        await pusherServer.trigger(
            getRoomChannel(matchId),
            ROOM_EVENTS.PLAYER_JOINED,
            { player: result.player }
        );

        return { success: true };
    } catch (error) {
        console.error('joinWaitingMatch error:', error);
        return { success: false, error: 'Failed to join match' };
    }
}

/**
 * Trigger bot "join" for Bot mode waiting room
 * Bot is already in players[], this just broadcasts for UI update
 */
export async function triggerBotJoin(matchId: string): Promise<void> {
    const match = await prisma.match.findUnique({
        where: { id: matchId },
    });

    if (!match || match.players.length < 2) return;

    const botPlayer = match.players.find(p => p.isBot);
    if (!botPlayer) return;

    // Broadcast that bot "joined"
    await pusherServer.trigger(
        getRoomChannel(matchId),
        ROOM_EVENTS.PLAYER_JOINED,
        { player: botPlayer }
    );
}

/**
 * Start the waiting match (changes status to 'playing')
 * Called after countdown in waiting room
 */
export async function startWaitingMatch(matchId: string): Promise<void> {
    await prisma.match.update({
        where: { id: matchId },
        data: {
            status: MatchStatus.playing,
            startedAt: new Date(),
        },
    });

    // Broadcast game started
    await pusherServer.trigger(
        getRoomChannel(matchId),
        ROOM_EVENTS.GAME_STARTED,
        { matchId }
    );
}

/**
 * Host initiates the game start countdown
 * Validates that the caller is the host and there are 2 players
 */
export async function hostStartGame(
    matchId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const match = await prisma.match.findUnique({
            where: { id: matchId },
        });

        if (!match) {
            return { success: false, error: 'Match not found' };
        }

        if (match.status !== MatchStatus.waiting) {
            return { success: false, error: 'Match is not in waiting state' };
        }

        // Validate caller is the host (player_1)
        const host = match.players.find((p: MatchPlayer) => p.playerId === 'player_1');
        if (!host || host.userId !== userId) {
            return { success: false, error: 'Only the host can start the game' };
        }

        // Validate there are 2 players
        if (match.players.length < 2) {
            return { success: false, error: 'Need 2 players to start' };
        }

        // Broadcast START_COUNTDOWN to all players in the room
        await pusherServer.trigger(
            getRoomChannel(matchId),
            ROOM_EVENTS.START_COUNTDOWN,
            { matchId }
        );

        return { success: true };
    } catch (error) {
        console.error('hostStartGame error:', error);
        return { success: false, error: 'Failed to start game' };
    }
}

/**
 * Get basic match info for waiting room
 */
export async function getMatchInfo(matchId: string): Promise<{
    id: string;
    targetLanguage: TargetLanguage;
    rank: number;
    questionCount: number;
    status: MatchStatus;
    players: MatchPlayer[];
    isBot: boolean;
} | null> {
    const match = await prisma.match.findUnique({
        where: { id: matchId },
    });

    if (!match) return null;

    return {
        id: match.id,
        targetLanguage: match.targetLanguage,
        rank: match.rank,
        questionCount: match.questionCount,
        status: match.status,
        players: match.players,
        isBot: match.players.some(p => p.isBot),
    };
}

/**
 * Leave/cancel a waiting room
 * If host leaves, cancels the match
 */
export async function leaveWaitingMatch(
    matchId: string,
    userId: string
): Promise<void> {
    const match = await prisma.match.findUnique({
        where: { id: matchId },
    });

    if (!match || match.status !== MatchStatus.waiting) return;

    const isHost = match.players[0]?.userId === userId;

    if (isHost) {
        // Host leaving cancels the match
        await prisma.match.update({
            where: { id: matchId },
            data: { status: MatchStatus.cancelled },
        });

        await pusherServer.trigger(
            getRoomChannel(matchId),
            ROOM_EVENTS.HOST_LEFT,
            {}
        );
    } else {
        // Guest leaving removes them from players
        const updatedPlayers = match.players.filter(p => p.userId !== userId);
        await prisma.match.update({
            where: { id: matchId },
            data: { players: updatedPlayers },
        });

        // Notify host that guest left
        await pusherServer.trigger(
            getRoomChannel(matchId),
            ROOM_EVENTS.GUEST_LEFT,
            {}
        );
    }
}

