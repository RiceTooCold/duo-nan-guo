'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { startGame, submitAnswer } from '@/actions/game.server';
import { GamePhase, type GameState, type GameSession, type PlayerState } from '@/types/game';
import type { TargetLanguage } from '@/generated/prisma';

export function useGameLoop() {
    const [state, setState] = useState<GameState>({
        phase: GamePhase.IDLE,
        currentQuestionIndex: 0,
        timeLeft: 15,
        session: null,
        players: {},
        winnerId: null,
        lastResult: null,
        error: null,
        correctAnswer: null,
        playerAnswer: null,
        botAnswer: null,
    });

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize game session
    const initGame = useCallback(async (userId: string | null, config: { lang: TargetLanguage, rank: number }) => {
        try {
            setState((prev: GameState) => ({ ...prev, phase: GamePhase.IDLE, error: null }));
            const session = await startGame(userId, config);

            const initialPlayers: Record<string, PlayerState> = {};
            session.players.forEach((p: any) => {
                initialPlayers[p.playerId] = {
                    id: p.playerId,
                    name: p.name,
                    score: 0,
                    health: 100,
                    streak: 0,
                    isBot: p.isBot,
                    avatar: p.avatar,
                };
            });

            setState((prev: GameState) => ({
                ...prev,
                session,
                players: initialPlayers,
                phase: GamePhase.COUNTDOWN,
                timeLeft: 3,
            }));
        } catch (err: any) {
            setState((prev: GameState) => ({ ...prev, error: err.message || 'Failed to start game' }));
        }
    }, []);

    // Handle countdown to playing
    useEffect(() => {
        if (state.phase === GamePhase.COUNTDOWN) {
            if (state.timeLeft > 0) {
                const timer = setTimeout(() => {
                    setState((prev: GameState) => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
                }, 1000);
                return () => clearTimeout(timer);
            } else {
                setState((prev: GameState) => ({ ...prev, phase: GamePhase.PLAYING, timeLeft: 15 }));
            }
        }
    }, [state.phase, state.timeLeft]);

    // Handle playing timer
    useEffect(() => {
        if (state.phase === GamePhase.PLAYING) {
            if (state.timeLeft > 0) {
                timerRef.current = setInterval(() => {
                    setState((prev: GameState) => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
                }, 1000);
                return () => {
                    if (timerRef.current) clearInterval(timerRef.current);
                };
            } else {
                // Time's up - auto fail for player
                handleAnswer('');
            }
        }
    }, [state.phase, state.timeLeft]);

    // Handle Answer Submission (Common logic for both Human and Bot)
    const processAnswer = async (playerId: string, answer: string) => {
        if (!state.session) return;

        const questionId = state.session.questions[state.currentQuestionIndex].id;
        const userId = state.session.players.find(p => p.playerId === playerId)?.userId || null;

        try {
            const result = await submitAnswer(state.session.matchId, questionId, answer, userId);

            setState((prev: GameState) => {
                const player = prev.players[playerId];
                const newScore = player.score + (result?.newScore || 0);
                const newHealth = Math.max(0, player.health + (result?.newHealth || 0));
                const newStreak = result?.isCorrect ? player.streak + 1 : 0;

                return {
                    ...prev,
                    lastResult: result,
                    players: {
                        ...prev.players,
                        [playerId]: {
                            ...player,
                            score: newScore,
                            health: newHealth,
                            streak: newStreak,
                        }
                    }
                };
            });

            return result;
        } catch (err) {
            console.error('Answer submission failed:', err);
            return null;
        }
    };

    const handleAnswer = async (answer: string) => {
        if (state.phase !== GamePhase.PLAYING) return;

        // Store player answer and transition to RESOLVING
        setState((prev: GameState) => ({
            ...prev,
            phase: GamePhase.RESOLVING,
            playerAnswer: answer,
        }));

        // Process player answer and get result
        const result = await processAnswer('player_1', answer);

        // Update correctAnswer from result
        if (result) {
            setState((prev: GameState) => ({
                ...prev,
                correctAnswer: result.correctAnswer,
            }));
        }

        // After 2 seconds, move to next question or end game
        setTimeout(() => {
            setState((prev: GameState) => {
                const isLastQuestion = prev.currentQuestionIndex >= (prev.session?.questions.length || 0) - 1;
                const playerDead = Object.values(prev.players).some((p: PlayerState) => p.health <= 0);

                if (isLastQuestion || playerDead) {
                    // Determine winner
                    const p1 = prev.players['player_1'];
                    const b1 = prev.players['bot_1'];
                    let winnerId = null;
                    if (p1.health > 0 && (b1.health <= 0 || p1.score > b1.score)) winnerId = 'player_1';
                    else if (b1.health > 0) winnerId = 'bot_1';

                    return { ...prev, phase: GamePhase.FINISHED, winnerId, lastResult: null };
                } else {
                    return {
                        ...prev,
                        phase: GamePhase.PLAYING,
                        currentQuestionIndex: prev.currentQuestionIndex + 1,
                        timeLeft: 15,
                        lastResult: null,
                        // Reset answer states for new question
                        correctAnswer: null,
                        playerAnswer: null,
                        botAnswer: null,
                    };
                }
            });
        }, 2000);
    };

    // Bot entry point
    const handleBotAnswer = async (answer: string) => {
        if (state.phase !== GamePhase.PLAYING && state.phase !== GamePhase.RESOLVING) return;

        // Store bot answer
        setState((prev: GameState) => ({
            ...prev,
            botAnswer: answer,
        }));

        // Process bot answer and get result
        const result = await processAnswer('bot_1', answer);

        // Update correctAnswer if not already set
        if (result && !state.correctAnswer) {
            setState((prev: GameState) => ({
                ...prev,
                correctAnswer: result.correctAnswer,
            }));
        }
    };

    return {
        state,
        initGame,
        handleAnswer,
        handleBotAnswer,
    };
}
