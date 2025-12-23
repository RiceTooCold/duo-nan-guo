/**
 * GameRoom - Server-side game logic
 * Handles all game state transitions, validation, and Pusher broadcasting
 * 
 * DESIGN: Player-agnostic
 * - Uses playerStates[playerId] not self/opponent
 * - Works for both bot matches and future multiplayer
 */

import { prisma } from '@/lib/prisma';
import { MatchStatus } from '@/generated/prisma';
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

const TIME_PER_QUESTION = 15; // seconds
const RESOLVING_DURATION = 3000; // ms

// Simple in-memory lock to prevent duplicate bot triggers
const botProcessingLocks = new Set<string>();

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

    // Trigger bot answer if there's a bot player
    const botPlayer = match.players.find(p => p.isBot);
    if (botPlayer) {
        triggerBotAnswer(matchId, botPlayer.playerId, state.currentQuestionIndex, botPlayer.botModel || undefined).catch(console.error);
    }

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
                const scoreChange = isCorrect ? 10 : 0;

                // Log answer submission with player name
                const player = match.players.find(p => p.playerId === playerId);
                const playerName = player?.name || playerId;
                console.log(`📝 [Answer] ${playerName} (${isCorrect ? '✅' : '❌'}): ${answer}`);

                // 4. Update player state
                const newStreak = isCorrect ? playerState.streak + 1 : 0;
                const updatedPlayerState: PlayerGameState = {
                    score: playerState.score + scoreChange,
                    streak: newStreak,
                    maxStreak: Math.max(playerState.maxStreak, newStreak),
                    answer,
                    isCorrect,
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
                    // Calculate response time: roughly (endTime - timePerQuestion*1000) vs now?
                    // Or simpler: (endTime - now). But endTime is when round ends.
                    // Better approximation: Game started at (endTime - 10000). So response time = 10000 - (endTime - now)
                    // Assuming 10s per question.
                    const timePerQuestionMs = 10000;
                    const timeLeftMs = Math.max(0, state.endTime - Date.now());
                    const responseTimeMs = Math.max(0, timePerQuestionMs - timeLeftMs);

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
                    scheduleNextAction(matchId, match.questionIds.length);
                }

                return newState;
            });
        } catch (error: unknown) {
            attempt++;
            const isConflict = error instanceof PrismaClientKnownRequestError &&
                (error.code === 'P2002' || // WriteConflict
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
}

/**
 * Handle timeout (called by client when endTime is reached)
 * Uses transaction with retry logic for concurrency safety
 */
export async function handleTimeout(matchId: string): Promise<LiveGameState> {
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

                // 3. Mark unanswered players as wrong
                const newPlayerStates: { [playerId: string]: PlayerGameState } = {};
                for (const [playerId, playerState] of Object.entries(state.playerStates)) {
                    if (playerState.answer === null) {
                        newPlayerStates[playerId] = {
                            ...playerState,
                            answer: '',
                            isCorrect: false,
                            streak: 0,
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

                // 5. Broadcast and schedule next action
                await broadcastState(matchId, newState);
                scheduleNextAction(matchId, match.questionIds.length);

                return newState;
            });
        } catch (error: unknown) {
            attempt++;
            const isConflict = error instanceof PrismaClientKnownRequestError &&
                (error.code === 'P2002' ||
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
}

/**
 * Move to next question or finish game
 */
async function scheduleNextAction(matchId: string, totalQuestions: number) {
    console.log(`⏰ [Schedule] Next action for match ${matchId.slice(-4)} in ${RESOLVING_DURATION}ms`);
    setTimeout(async () => {
        try {
            const state = await getGameState(matchId);
            if (!state) return;

            const isLastQuestion = state.currentQuestionIndex >= totalQuestions - 1;

            if (isLastQuestion) {
                await finishGame(matchId);
            } else {
                await nextQuestion(matchId);
            }
        } catch (error) {
            console.error('Error in scheduleNextAction:', error);
        }
    }, RESOLVING_DURATION);
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

    // --- Update UserStats for logged-in players ---
    const realPlayers = updatedPlayers.filter(p => !p.isBot && p.userId);

    for (const player of realPlayers) {
        if (!player.userId) continue;

        const isWin = winnerPlayerId === player.playerId;
        const isLoss = !isWin && !isTie;

        // Calculate XP
        let xpGained = 0;
        if (isWin) xpGained = 100;
        else if (isTie) xpGained = 50;
        else if (isLoss) xpGained = 20;

        // Fetch current user stats
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

        // Update User Stats
        await prisma.user.update({
            where: { id: player.userId },
            data: {
                stats: {
                    set: {
                        totalMatches: currentStats.totalMatches + 1,
                        wins: currentStats.wins + (isWin ? 1 : 0),
                        losses: currentStats.losses + (isLoss ? 1 : 0),
                        ties: currentStats.ties + (isTie ? 1 : 0),
                        correctRate: currentStats.correctRate, // TODO: Update with actual rate
                        totalXp: currentStats.totalXp + xpGained
                    }
                }
            }
        });

        console.log(`✅ [finishGame] Updated stats for user ${player.userId}: +${xpGained}XP`);
    }

    console.log(`✅ [finishGame] Match ${matchId} successfully finished`);
}


/**
 * Trigger bot to answer
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
        // Get LLM answer using the bot's model
        const { answer, thinkingMs } = await getBotAnswer(matchId, questionId, botModel);

        // Wait for thinking time
        await new Promise(resolve => setTimeout(resolve, thinkingMs));

        // Check if still valid (phase, already answered, and time remaining)
        const currentState = await getGameState(matchId);
        if (!currentState || currentState.phase !== GamePhase.PLAYING) {
            return;
        }
        if (currentState.playerStates[botPlayerId]?.answer !== null) {
            return;
        }
        // Check if time is still valid (with 500ms buffer)
        if (Date.now() > currentState.endTime - 500) {
            console.log(`⏱️ [Bot] Time ran out for match ${matchId.slice(-4)}, skipping answer`);
            return; // Let timeout handler manage this
        }

        // Submit answer
        await submitAnswer(matchId, botPlayerId, answer);
    } catch (error) {
        console.error('Bot answer error:', error);
    } finally {
        // Release lock
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
