'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { GamePhase } from '@/types/game';
import { getPusherClient, getMatchChannel, PUSHER_EVENTS } from '@/lib/pusher';
import {
    initAndStartGameRoom,
    submitServerAnswer,
    reportTimeout,
    getMatch,
    performBotMove,
    proceedToNextPhase,
} from '@/actions/game.server';
import type { LiveGameState, ClientGameView } from '@/lib/game-engine/server/GameStore';
import type { ClientQuestion, GameSession } from '@/types/game';

/** Client-side hash function (must match server) */
function hashAnswer(answer: string): string {
    let hash = 0;
    for (let i = 0; i < answer.length; i++) {
        const char = answer.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

/** Optimistic answer state for instant feedback */
interface OptimisticAnswer {
    answer: string;
    isCorrect: boolean;
    questionIndex: number;
}

interface UseGameClientReturn {
    // Transformed view (self/opponent perspective)
    view: ClientGameView | null;
    session: GameSession | null;
    isLoading: boolean;
    error: string | null;
    timeLeft: number;
    currentQuestion: ClientQuestion | undefined;
    selfAnswered: boolean;
    opponentAnswered: boolean;
    handleAnswer: (answer: string) => Promise<void>;
    handleTimeout: () => Promise<void>;
}

/**
 * Game client hook with perspective transformation
 * Automatically detects selfPlayerId from auth session
 */
export function useGameClient(matchId: string): UseGameClientReturn {
    const { data: authSession } = useSession();
    const [liveState, setLiveState] = useState<LiveGameState | null>(null);
    const [session, setSession] = useState<GameSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(15);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const initializedRef = useRef(false);
    const timeoutReportedRef = useRef(false);

    // Optimistic answer for instant feedback
    const [optimisticAnswer, setOptimisticAnswer] = useState<OptimisticAnswer | null>(null);

    // Determine selfPlayerId from session + game data
    const selfPlayerId = useMemo(() => {
        if (!authSession?.user?.id || !session?.players) return 'player_1'; // fallback
        const myPlayer = session.players.find(p => p.userId === authSession.user.id);
        return myPlayer?.playerId || 'player_1';
    }, [authSession?.user?.id, session?.players]);

    // Find opponent playerId from session
    const opponentPlayerId = useMemo(() => {
        if (!session) return null;
        const opponent = session.players?.find(p => p.playerId !== selfPlayerId);
        return opponent?.playerId || null;
    }, [session, selfPlayerId]);

    // Transform LiveGameState to ClientGameView (self/opponent perspective)
    const view = useMemo((): ClientGameView | null => {
        if (!liveState || !session || !opponentPlayerId) return null;

        const selfPlayer = session.players?.find(p => p.playerId === selfPlayerId);
        const opponentPlayer = session.players?.find(p => p.playerId === opponentPlayerId);

        if (!selfPlayer || !opponentPlayer) return null;

        const selfState = liveState.playerStates[selfPlayerId];
        const opponentState = liveState.playerStates[opponentPlayerId];

        if (!selfState || !opponentState) return null;

        return {
            phase: liveState.phase,
            currentQuestionIndex: liveState.currentQuestionIndex,
            timeLeft,
            self: {
                playerId: selfPlayerId,
                name: selfPlayer.name,
                avatar: selfPlayer.avatar || null,
                isBot: selfPlayer.isBot,
                score: selfState.score,
                streak: selfState.streak,
                maxStreak: selfState.maxStreak,
                // Use optimistic answer if available and matches current question
                answer: (optimisticAnswer?.questionIndex === liveState.currentQuestionIndex)
                    ? optimisticAnswer.answer
                    : selfState.answer,
                isCorrect: (optimisticAnswer?.questionIndex === liveState.currentQuestionIndex)
                    ? optimisticAnswer.isCorrect
                    : selfState.isCorrect,
                lastScoreChange: selfState.lastScoreChange ?? 0,
            },
            opponent: {
                playerId: opponentPlayerId,
                name: opponentPlayer.name,
                avatar: opponentPlayer.avatar || null,
                isBot: opponentPlayer.isBot,
                score: opponentState.score,
                streak: opponentState.streak,
                maxStreak: opponentState.maxStreak,
                answer: opponentState.answer,
                isCorrect: opponentState.isCorrect,
                lastScoreChange: opponentState.lastScoreChange ?? 0,
            },
            correctAnswer: liveState.correctAnswer,
            winnerId: liveState.winnerId,
            endTime: liveState.endTime,
        };
    }, [liveState, session, selfPlayerId, opponentPlayerId, timeLeft]);

    // Calculate timeLeft from endTime
    const updateTimeLeft = useCallback((endTime: number) => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        return remaining;
    }, []);

    // Initialize game and subscribe to Pusher
    useEffect(() => {
        if (!matchId || initializedRef.current) return;
        initializedRef.current = true;

        const init = async () => {
            try {
                // 1. Load match data for questions and player info
                const matchResult = await getMatch(matchId);
                if ('error' in matchResult) {
                    setError(matchResult.error);
                    setIsLoading(false);
                    return;
                }
                setSession(matchResult);

                // 2. Start game room
                const result = await initAndStartGameRoom(matchId);
                if (!result.success) {
                    setError(result.error || 'Failed to start game');
                    setIsLoading(false);
                    return;
                }

                setLiveState(result.state as LiveGameState);
                setIsLoading(false);

                // 3. Subscribe to Pusher
                const pusher = getPusherClient();
                const channel = pusher.subscribe(getMatchChannel(matchId));

                channel.bind(PUSHER_EVENTS.STATE_UPDATE, (newState: LiveGameState) => {
                    setLiveState(newState);
                    timeoutReportedRef.current = false; // Reset on new round
                });

            } catch (err) {
                setError((err as Error).message);
                setIsLoading(false);
            }
        };

        init();

        return () => {
            const pusher = getPusherClient();
            pusher.unsubscribe(getMatchChannel(matchId));
        };
    }, [matchId]);

    // Timer effect - update timeLeft from endTime
    useEffect(() => {
        if (!liveState || liveState.phase !== GamePhase.PLAYING || !liveState.endTime) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        // Initial update
        updateTimeLeft(liveState.endTime);

        // Update every 100ms for smooth countdown
        timerRef.current = setInterval(() => {
            const remaining = updateTimeLeft(liveState.endTime);
            if (remaining <= 0) {
                if (timerRef.current) clearInterval(timerRef.current);
            }
        }, 100);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [liveState?.phase, liveState?.endTime, updateTimeLeft]);

    // Visibility change detection - sync state when tab becomes visible
    useEffect(() => {
        if (!matchId) return;

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                console.log('👁️ [Visibility] Tab became visible, syncing state...');
                try {
                    // Re-fetch latest state when tab becomes visible
                    const result = await initAndStartGameRoom(matchId);
                    if (result.success && result.state) {
                        setLiveState(result.state as LiveGameState);
                        // Also update timeLeft immediately
                        if (result.state.endTime) {
                            updateTimeLeft(result.state.endTime);
                        }
                    }
                } catch (err) {
                    console.error('Visibility sync error:', err);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [matchId, updateTimeLeft]);

    // Handle timeout
    const handleTimeout = useCallback(async () => {
        if (timeoutReportedRef.current) return;
        timeoutReportedRef.current = true;

        try {
            await reportTimeout(matchId);
        } catch (err) {
            console.error('Timeout report error:', err);
        }
    }, [matchId]);

    // Auto-report timeout when timeLeft reaches 0
    // player_1 reports immediately, player_2 waits 1.5s as fallback (in case player_1 is offline)
    useEffect(() => {
        if (timeLeft <= 0 && liveState?.phase === GamePhase.PLAYING) {
            if (selfPlayerId === 'player_1') {
                // Leader: report immediately
                handleTimeout();
            } else {
                // Fallback: wait 1.5 seconds before reporting (gives player_1 time to report first)
                const fallbackTimer = setTimeout(() => {
                    // Only report if still in PLAYING phase (player_1 didn't report)
                    if (liveState?.phase === GamePhase.PLAYING) {
                        console.log('⏰ [Fallback] Player2 reporting timeout (player_1 may be offline)');
                        handleTimeout();
                    }
                }, 1500);
                return () => clearTimeout(fallbackTimer);
            }
        }
    }, [timeLeft, liveState?.phase, handleTimeout, selfPlayerId]);

    // Submit answer with instant feedback via hash comparison
    const handleAnswer = useCallback(async (answer: string) => {
        if (!liveState || liveState.phase !== GamePhase.PLAYING || !session) return;

        // Get current question
        const currentQ = session.questions[liveState.currentQuestionIndex];
        if (!currentQ) return;

        // 1. Instant verification using hash (0ms delay!)
        const answerHash = hashAnswer(answer);
        const correctHash = session.correctAnswerHashes[currentQ.id];
        const isCorrect = answerHash === correctHash;

        // 2. Optimistic update for instant UI feedback
        setOptimisticAnswer({
            answer,
            isCorrect,
            questionIndex: liveState.currentQuestionIndex,
        });

        console.log(`⚡ [Instant] Answer ${answer} is ${isCorrect ? 'correct ✓' : 'wrong ✗'}`);

        // 3. Submit to server in background (for scoring)
        submitServerAnswer(matchId, selfPlayerId, answer).catch(err => {
            console.error('Submit answer error:', err);
        });
    }, [matchId, selfPlayerId, liveState?.phase, liveState?.currentQuestionIndex, session]);

    // NEW: Client-driven bot triggering
    const opponentState = liveState?.playerStates[opponentPlayerId || ''];

    useEffect(() => {
        if (!liveState || liveState.phase !== GamePhase.PLAYING || !session) return;

        const opponent = session.players.find(p => p.playerId === opponentPlayerId);
        if (opponent?.isBot && opponentState?.answer === null) {
            // It's a bot's turn and it hasn't answered yet
            console.log('🤖 [Client] Triggering bot move for', opponent.playerId);
            performBotMove(
                matchId,
                opponent.playerId,
                liveState.currentQuestionIndex,
                opponent.botModel || undefined
            ).catch(err => console.error('Bot trigger error:', err));
        }
    }, [liveState?.phase, liveState?.currentQuestionIndex, session, opponentPlayerId, opponentState?.answer, matchId]);

    // NEW: Client-driven phase transition (RESOLVING -> PLAYING/FINISHED)
    useEffect(() => {
        if (!liveState || liveState.phase !== GamePhase.RESOLVING) return;

        // Advance after 2 seconds (matching RESOLVING_DURATION)
        const advanceTimer = setTimeout(async () => {
            console.log('➡️ [Client] Advancing to next phase...');
            try {
                await proceedToNextPhase(matchId);
            } catch (err) {
                console.error('Phase advance error:', err);
            }
        }, 2000);

        return () => clearTimeout(advanceTimer);
    }, [liveState?.phase, liveState?.currentQuestionIndex, matchId]);

    // Derived values
    const currentQuestion = session?.questions[liveState?.currentQuestionIndex ?? 0];
    // Check for explicit answer (not null, not undefined, and NOT empty string which means timeout)
    const selfAnswered = !!view?.self?.answer;
    const opponentAnswered = !!view?.opponent?.answer;

    return {
        view,
        session,
        isLoading,
        error,
        timeLeft,
        currentQuestion,
        selfAnswered,
        opponentAnswered,
        handleAnswer,
        handleTimeout,
    };
}
