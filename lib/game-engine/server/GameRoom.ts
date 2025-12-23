/**
 * GameRoom - Server-side game logic
 * Handles all game state transitions, validation, and Pusher broadcasting
 * 
 * DESIGN: Player-agnostic
 * - Uses playerStates[playerId] not self/opponent
 * - Works for both bot matches and future multiplayer
 */

import { prisma } from '@/lib/prisma';
import { MatchStatus } from '@prisma/client';
import { GamePhase } from '@/types/game';
import { pusherServer, getMatchChannel, PUSHER_EVENTS } from '@/lib/pusher';
import {
    getGameState,
    setGameState,
    createInitialPlayerState,
    type LiveGameState,
    type PlayerGameState
} from './GameStore';
import { getBotAnswer } from '@/actions/bot.server';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/binary';
import { calculateScore } from '@/lib/config/game';

const TIME_PER_QUESTION = 15; // seconds
const RESOLVING_DURATION = 2000; // ms - time to show correct answer

// Simple in-memory lock to prevent duplicate bot triggers
const botProcessingLocks = new Set<string>();

/**
 * MatchMutex - Ensures sequential processing of answer submissions per match
 * 
 * Why: When player and bot submit answers within milliseconds, both Prisma transactions
 * read the same liveState and try to write simultaneously, causing P2034 conflicts.
 * Database-level retry is insufficient when operations collide repeatedly.
 * 
 * Solution: Serialize all write operations per match using an async mutex.
 * Later submissions wait for earlier ones to complete before acquiring the lock.
 */
class MatchMutex {
    private locks = new Map<string, Promise<void>>();

    /**
     * Execute a function with exclusive access to a match
     * @param matchId - The match to lock
     * @param fn - The async function to execute while holding the lock
     * @returns The result of fn()
     */
    async withLock<T>(matchId: string, fn: () => Promise<T>): Promise<T> {
        // Wait for any existing operation on this match to complete
        const existingLock = this.locks.get(matchId);

        // Create a new promise for this operation
        let releaseLock: () => void;
        const newLock = new Promise<void>((resolve) => {
            releaseLock = resolve;
        });

        // Set our lock as the current one (others will wait for this)
        this.locks.set(matchId, newLock);

        try {
            // Wait for previous operation if any
            if (existingLock) {
                console.log(`🔒 [Mutex] Waiting for lock on match ${matchId.slice(-4)}`);
                await existingLock;
            }
            console.log(`🔓 [Mutex] Acquired lock for match ${matchId.slice(-4)}`);

            // Execute the protected operation
            return await fn();
        } finally {
            // Release the lock
            console.log(`🔓 [Mutex] Released lock for match ${matchId.slice(-4)}`);
            releaseLock!();

            // Clean up if no one else is waiting
            if (this.locks.get(matchId) === newLock) {
                this.locks.delete(matchId);
            }
        }
    }
}

// Global mutex instance for answer submissions
const matchMutex = new MatchMutex();

/**
 * Initialize a game room from a match
 * IDEMPOTENT: If already playing, returns existing state
 */
export async function initGameRoom(matchId: string): Promise<LiveGameState> {
    // Get match data
    const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: {
            players: true,
            questionIds: true,
            timePerQuestion: true,
            status: true,
            liveState: true,
        },
    });

    if (!match) {
        throw new Error('Match not found');
    }

    // IDEMPOTENCY: If already playing, return existing state
    if (match.status === MatchStatus.playing && match.liveState) {
        console.log(`✅ [initGameRoom] Match ${matchId.slice(-4)} already playing, returning existing state`);
        return match.liveState as unknown as LiveGameState;
    }

    if (match.players.length < 2) {
        throw new Error('Not enough players');
    }

    // Create initial state with playerStates for each player
    const playerStates: { [playerId: string]: PlayerGameState } = {};
    for (const player of match.players) {
        playerStates[player.playerId] = createInitialPlayerState();
    }

    const state: LiveGameState = {
        phase: GamePhase.READY,
        currentQuestionIndex: 0,
        endTime: 0,
        playerStates,
        correctAnswer: null,
        winnerId: null,
    };

    // Save and update match status
    await setGameState(matchId, state);
    await prisma.match.update({
        where: { id: matchId },
        data: { status: MatchStatus.playing, startedAt: new Date() },
    });

    return state;
}

/**
 * Start a round (set endTime and trigger bot if needed)
 * GUARD: If already PLAYING, returns current state
 */
export async function startRound(matchId: string): Promise<LiveGameState> {
    const state = await getGameState(matchId);
    if (!state) throw new Error('Game not found');

    // Guard: If already playing, return current state
    if (state.phase === GamePhase.PLAYING) {
        console.log(`⚠️ [startRound] Skipped - already in PLAYING phase`);
        return state;
    }

    // Get match to find bot player
    const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: { players: true, timePerQuestion: true },
    });
    if (!match) throw new Error('Match not found');

    const timePerQ = match.timePerQuestion || TIME_PER_QUESTION;
    const endTime = Date.now() + (timePerQ * 1000);

    // Reset answers for new round
    const resetPlayerStates: { [playerId: string]: PlayerGameState } = {};
    for (const [playerId, playerState] of Object.entries(state.playerStates)) {
        resetPlayerStates[playerId] = {
            ...playerState,
            answer: null,
            isCorrect: null,
        };
    }

    const newState: LiveGameState = {
        ...state,
        phase: GamePhase.PLAYING,
        endTime,
        playerStates: resetPlayerStates,
        correctAnswer: null,
    };

    await setGameState(matchId, newState);
    await broadcastState(matchId, newState);

    await setGameState(matchId, newState);
    await broadcastState(matchId, newState);

    return newState;
}

/**
 * Submit an answer for a player (with transaction for concurrency safety)
 */
export async function submitAnswer(
    matchId: string,
    playerId: string,
    answer: string
): Promise<LiveGameState> {
    // Use mutex to serialize answer submissions per match
    // This prevents P2034 conflicts when player and bot submit simultaneously
    return matchMutex.withLock(matchId, async () => {
        // Use transaction to ensure atomic read-modify-write
        // MongoDB transactions may face write conflicts. Retry up to 3 times.
        let attempt = 0;
        while (attempt < 3) {
            try {
                return await prisma.$transaction(async (tx) => {
                    // 1. Read current state within transaction
                    const match = await tx.match.findUnique({
                        where: { id: matchId },
                        select: {
                            liveState: true,
                            questionIds: true,
                            players: true,
                            timePerQuestion: true,
                        },
                    });

                    if (!match?.liveState) throw new Error('Game not found');
                    const state = match.liveState as unknown as LiveGameState;

                    // 2. Validate game state
                    if (state.phase !== GamePhase.PLAYING) {
                        throw new Error('Not in playing phase');
                    }

                    if (Date.now() > state.endTime) {
                        // Time is up - return current state instead of error
                        // The timeout handler will mark unanswered players
                        console.log(`⏱️ [submitAnswer] Time expired for ${playerId}, ignoring late answer`);
                        return state;
                    }

                    const playerState = state.playerStates[playerId];
                    if (!playerState) {
                        throw new Error(`Player ${playerId} not found in game`);
                    }

                    if (playerState.answer !== null) {
                        throw new Error('Already answered');
                    }

                    // 3. Get correct answer
                    const questionId = match.questionIds[state.currentQuestionIndex];
                    const question = await tx.question.findUnique({
                        where: { id: questionId },
                        select: { correctAnswer: true },
                    });
                    if (!question) throw new Error('Question not found');

                    const isCorrect = answer === question.correctAnswer;

                    // Calculate response time using actual match timePerQuestion
                    const timePerQuestionMs = (match.timePerQuestion || 15) * 1000;
                    const timeLeftMs = Math.max(0, state.endTime - Date.now());
                    const responseTimeMs = Math.max(0, timePerQuestionMs - timeLeftMs);

                    // Calculate score using advanced scoring (speed bonus + combo)
                    const scoreChange = calculateScore(isCorrect, responseTimeMs, playerState.streak);

                    // Log answer submission with player name
                    const player = match.players.find(p => p.playerId === playerId);
                    const playerName = player?.name || playerId;
                    console.log(`📝 [Answer] ${playerName} (${isCorrect ? '✅' : '❌'}): ${answer}, responseTime=${responseTimeMs}ms, streak=${playerState.streak}, score=+${scoreChange}`);

                    // 4. Update player state
                    const newStreak = isCorrect ? playerState.streak + 1 : 0;
                    const updatedPlayerState: PlayerGameState = {
                        score: playerState.score + scoreChange,
                        streak: newStreak,
                        maxStreak: Math.max(playerState.maxStreak, newStreak),
                        answer,
                        isCorrect,
                        lastScoreChange: scoreChange,
                    };

                    const newPlayerStates = {
                        ...state.playerStates,
                        [playerId]: updatedPlayerState,
                    };

                    // Check if all players answered
                    const allAnswered = Object.values(newPlayerStates).every(ps => ps.answer !== null);

                    let newState: LiveGameState = {
                        ...state,
                        playerStates: newPlayerStates,
                    };

                    if (allAnswered) {
                        newState = {
                            ...newState,
                            phase: GamePhase.RESOLVING,
                            correctAnswer: question.correctAnswer,
                        };
                    }

                    // 5a. Save state atomically within transaction
                    await tx.match.update({
                        where: { id: matchId },
                        data: { liveState: newState as unknown as object },
                    });

                    // 5b. Write AnswerRecord if player exists
                    if (player) {
                        await tx.answerRecord.create({
                            data: {
                                matchId,
                                questionId,
                                userId: player.userId || null, // null for rule bots
                                answer,
                                isCorrect,
                                responseTimeMs,
                            }
                        });
                    }

                    // 6. Broadcast and schedule (outside transaction is fine)
                    await broadcastState(matchId, newState);

                    // Simple state logging
                    const logState = {
                        phase: newState.phase,
                        qIndex: newState.currentQuestionIndex,
                        scores: Object.fromEntries(
                            Object.entries(newState.playerStates).map(([pid, ps]) => [
                                // map playerId to simplified string "PlayerName:Score" if possible, otherwise just score
                                match.players.find(p => p.playerId === pid)?.name || pid,
                                ps.score
                            ])
                        )
                    };
                    console.log(`📡 [State] Match ${matchId.slice(-4)}:`, JSON.stringify(logState));

                    if (allAnswered) {
                        // In client-driven model, we don't schedule next action here anymore
                        // The client will see allAnswered (RESOLVING phase) and initiate the next step after animation
                    }

                    return newState;
                });
            } catch (error: unknown) {
                attempt++;
                const isConflict = error instanceof PrismaClientKnownRequestError &&
                    (error.code === 'P2002' || // Unique constraint
                        error.code === 'P2034' || // Transaction write conflict/deadlock (MongoDB)
                        error.message?.includes('WriteConflict') ||
                        error.message?.includes('conflict') ||
                        error.message?.includes('deadlock'));

                if (isConflict && attempt < 3) {
                    console.warn(`🔄 [submitAnswer] Retry attempt ${attempt} due to conflict`);
                    await new Promise(r => setTimeout(r, Math.random() * 100)); // Backoff
                    continue;
                }
                throw error;
            }
        }
        throw new Error('Max retries reached');
    });
}

/**
 * Handle timeout (called by client when endTime is reached)
 * Uses transaction with retry logic for concurrency safety
 */
export async function handleTimeout(matchId: string): Promise<LiveGameState> {
    // Use mutex to serialize with answer submissions
    // Prevents race between late answers and timeout handling
    return matchMutex.withLock(matchId, async () => {
        let attempt = 0;
        while (attempt < 3) {
            try {
                return await prisma.$transaction(async (tx) => {
                    // 1. Read current state within transaction
                    const match = await tx.match.findUnique({
                        where: { id: matchId },
                        select: {
                            liveState: true,
                            questionIds: true,
                            players: true,  // Need players to create AnswerRecords
                        },
                    });

                    if (!match?.liveState) throw new Error('Game not found');
                    const state = match.liveState as unknown as LiveGameState;

                    if (state.phase !== GamePhase.PLAYING) {
                        return state; // Already handled
                    }

                    // Validate that time is actually up (allow 1s buffer for clock skew)
                    if (Date.now() < state.endTime - 1000) {
                        console.warn(`⚠️ [handleTimeout] Rejected premature timeout. EndTime: ${state.endTime}, Now: ${Date.now()}`);
                        return state;
                    }

                    // 2. Get correct answer
                    const questionId = match.questionIds[state.currentQuestionIndex];
                    const question = await tx.question.findUnique({
                        where: { id: questionId },
                        select: { correctAnswer: true },
                    });

                    // 3. Mark unanswered players as wrong + create AnswerRecords for timeout
                    const newPlayerStates: { [playerId: string]: PlayerGameState } = {};
                    for (const [playerId, playerState] of Object.entries(state.playerStates)) {
                        if (playerState.answer === null) {
                            // Find the player to get userId
                            const player = match.players.find(p => p.playerId === playerId);

                            // Create AnswerRecord for timeout (answer: '', responseTimeMs: 0)
                            if (player?.userId) {
                                await tx.answerRecord.create({
                                    data: {
                                        matchId,
                                        questionId,
                                        userId: player.userId,
                                        answer: '',        // Empty = timeout
                                        isCorrect: false,
                                        responseTimeMs: 0, // 0 = no actual response
                                    }
                                });
                                console.log(`⏰ [Timeout] Created AnswerRecord for ${player.name} (timeout)`);
                            }

                            newPlayerStates[playerId] = {
                                ...playerState,
                                answer: '',
                                isCorrect: false,
                                streak: 0,
                                lastScoreChange: 0,
                            };
                        } else {
                            newPlayerStates[playerId] = playerState;
                        }
                    }

                    const newState: LiveGameState = {
                        ...state,
                        phase: GamePhase.RESOLVING,
                        playerStates: newPlayerStates,
                        correctAnswer: question?.correctAnswer || null,
                    };

                    // 4. Save state atomically within transaction
                    await tx.match.update({
                        where: { id: matchId },
                        data: { liveState: newState as unknown as object },
                    });

                    // 5. Broadcast (client will trigger next step after seeing RESOLVING phase)
                    await broadcastState(matchId, newState);

                    return newState;
                });
            } catch (error: unknown) {
                attempt++;
                const isConflict = error instanceof PrismaClientKnownRequestError &&
                    (error.code === 'P2002' || // Unique constraint
                        error.code === 'P2034' || // Transaction write conflict/deadlock (MongoDB)
                        error.message?.includes('WriteConflict') ||
                        error.message?.includes('conflict') ||
                        error.message?.includes('deadlock'));

                if (isConflict && attempt < 3) {
                    console.warn(`🔄 [handleTimeout] Retry attempt ${attempt} due to conflict`);
                    await new Promise(r => setTimeout(r, Math.random() * 100)); // Backoff
                    continue;
                }
                throw error;
            }
        }
        throw new Error('Max retries reached');
    });
}

/**
 * Force advance to next phase (triggered by client after RESOLVING duration)
 */
export async function advanceGamePhase(matchId: string): Promise<LiveGameState> {
    const state = await getGameState(matchId);
    if (!state || state.phase !== GamePhase.RESOLVING) {
        throw new Error('Can only advance from RESOLVING phase');
    }

    const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: { questionIds: true },
    });
    if (!match) throw new Error('Match not found');

    const isLastQuestion = state.currentQuestionIndex >= match.questionIds.length - 1;

    if (isLastQuestion) {
        await finishGame(matchId);
    } else {
        await nextQuestion(matchId);
    }

    const newState = await getGameState(matchId);
    return newState!;
}

/**
 * Move to next question
 * GUARD: Only proceeds if in RESOLVING phase
 */
async function nextQuestion(matchId: string): Promise<void> {
    const state = await getGameState(matchId);
    if (!state) return;

    // Guard: Only proceed if we're in RESOLVING phase
    if (state.phase !== GamePhase.RESOLVING) {
        console.log(`⚠️ [nextQuestion] Skipped - not in RESOLVING phase (current: ${state.phase})`);
        return;
    }

    const newState: LiveGameState = {
        ...state,
        phase: GamePhase.READY,
        currentQuestionIndex: state.currentQuestionIndex + 1,
        correctAnswer: null,
        endTime: 0,
    };

    await setGameState(matchId, newState);
    await broadcastState(matchId, newState);

    // Auto-start next round
    await startRound(matchId);
}

/**
 * Finish the game - write AnswerRecords and update UserStats
 * GUARD: Only proceeds if in RESOLVING phase
 */
async function finishGame(matchId: string): Promise<void> {
    const state = await getGameState(matchId);
    if (!state) return;

    // Guard: Only proceed if we're in RESOLVING phase (not already FINISHED)
    if (state.phase === GamePhase.FINISHED) {
        console.log(`⚠️ [finishGame] Skipped - already FINISHED`);
        return;
    }

    // Get match with full data for analytics
    const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: {
            id: true,
            players: true,
            questionIds: true,
            liveState: true,
            status: true, // Check if already finished
        },
    });
    if (!match) return;

    // Double-check: if match is already finished in DB, skip
    if (match.status === MatchStatus.finished) {
        console.log(`⚠️ [finishGame] Skipped - match already finished in DB`);
        return;
    }

    // Calculate winner (highest score) - winner is the playerId with highest score
    let winnerPlayerId: string | null = null;
    let maxScore = -1;
    let isTie = false;

    for (const [playerId, playerState] of Object.entries(state.playerStates)) {
        if (playerState.score > maxScore) {
            maxScore = playerState.score;
            winnerPlayerId = playerId;
            isTie = false;
        } else if (playerState.score === maxScore) {
            isTie = true;
        }
    }

    if (isTie) winnerPlayerId = null;

    // Convert playerId to userId for database storage
    const winnerPlayer = match.players.find(p => p.playerId === winnerPlayerId);
    const winnerUserId = winnerPlayer?.userId || null;

    const newState: LiveGameState = {
        ...state,
        phase: GamePhase.FINISHED,
        winnerId: winnerPlayerId, // Keep playerId for client display
    };

    await setGameState(matchId, newState);
    await broadcastState(matchId, newState);

    // Update match record with final scores
    const updatedPlayers = match.players.map(p => ({
        ...p,
        finalScore: state.playerStates[p.playerId]?.score || 0,
    }));

    console.log(`🏁 [finishGame] Updating match ${matchId} to finished (winner: ${winnerUserId || 'TIE'})`);

    await prisma.match.update({
        where: { id: matchId },
        data: {
            status: MatchStatus.finished,
            endedAt: new Date(),
            winnerId: winnerUserId, // Store actual userId
            isTie: isTie,           // Explicit tie flag
            players: { set: updatedPlayers },
        },
    });

    // Note: User stats are now calculated on-the-fly from Match/AnswerRecord
    // See: actions/user.server.ts -> getUserDashboardStats()

    console.log(`✅ [finishGame] Match ${matchId} successfully finished`);
}


/**
 * Trigger bot to answer (fire-and-forget, non-blocking)
 */
export async function triggerBotAnswer(matchId: string, botPlayerId: string, questionIndex: number, botModel?: string): Promise<void> {
    const lockKey = `${matchId}:${questionIndex}`;

    // Check if already processing
    if (botProcessingLocks.has(lockKey)) return;

    const state = await getGameState(matchId);
    if (!state) return;
    if (state.phase !== GamePhase.PLAYING) return;
    if (state.playerStates[botPlayerId]?.answer !== null) return;

    // Acquire lock
    botProcessingLocks.add(lockKey);

    // Get current question
    const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: { questionIds: true },
    });
    if (!match) {
        botProcessingLocks.delete(lockKey);
        return;
    }

    const questionId = match.questionIds[state.currentQuestionIndex];

    try {
        // Get LLM answer (already has 5s timeout built-in)
        const { answer } = await getBotAnswer(matchId, questionId, botModel);

        // Submit immediately without extra delay
        await submitAnswer(matchId, botPlayerId, answer);
    } catch (error) {
        console.error('Bot answer error:', error);
    } finally {
        botProcessingLocks.delete(lockKey);
    }
}

/**
 * Broadcast state to all clients via Pusher
 */
async function broadcastState(matchId: string, state: LiveGameState): Promise<void> {
    try {
        await pusherServer.trigger(
            getMatchChannel(matchId),
            PUSHER_EVENTS.STATE_UPDATE,
            state
        );
    } catch (error) {
        console.error('Pusher broadcast error:', error);
    }
}
