'use client';

import { useEffect, useCallback, useRef, useReducer } from 'react';
import { getMatch, submitAllAnswers } from '@/actions/game.server';
import { GamePhase } from '@/types/game';
import { gameReducer, initialGameState, hashAnswer, validateAnswerPure } from './gameReducer';

export interface AnswerEntry {
    questionId: string;
    answer: string;
    responseTimeMs: number;
    isCorrect: boolean;
    playerId: 'self' | 'opponent';
}

export function useGameLoop() {
    const [state, dispatch] = useReducer(gameReducer, initialGameState);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const questionStartTimeRef = useRef<number>(Date.now());
    const answersBufferRef = useRef<AnswerEntry[]>([]);
    const initializingRef = useRef<boolean>(false);
    const initializedMatchIdRef = useRef<string | null>(null);

    // Derived states (for UI convenience)
    const selfAnswered = state.selfAnswer !== null;
    const opponentAnswered = state.opponentAnswer !== null;

    // Initialize game session
    const initGame = useCallback(async (matchId: string) => {
        if (initializingRef.current) return;
        if (initializedMatchIdRef.current === matchId) return;

        try {
            initializingRef.current = true;
            answersBufferRef.current = [];

            const result = await getMatch(matchId);

            if ('error' in result) {
                dispatch({ type: 'SET_ERROR', payload: result.error });
                return;
            }

            const session = result;

            if (initializedMatchIdRef.current && initializedMatchIdRef.current !== matchId) {
                initializingRef.current = false;
                return;
            }

            initializedMatchIdRef.current = matchId;

            const selfPlayer = session.players.find(p => !p.isBot);
            const opponentPlayer = session.players.find(p => p.isBot) ||
                session.players.find(p => p.playerId !== selfPlayer?.playerId);

            dispatch({
                type: 'INIT_GAME',
                payload: {
                    session,
                    self: {
                        id: selfPlayer?.playerId || 'self',
                        name: selfPlayer?.name || 'You',
                        score: 0,
                        streak: 0,
                        maxStreak: 0,
                        isBot: false,
                        avatar: selfPlayer?.avatar,
                    },
                    opponent: {
                        id: opponentPlayer?.playerId || 'opponent',
                        name: opponentPlayer?.name || 'Opponent',
                        score: 0,
                        streak: 0,
                        maxStreak: 0,
                        isBot: opponentPlayer?.isBot || false,
                        avatar: opponentPlayer?.avatar,
                    }
                }
            });
        } catch (err: any) {
            dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to load game' });
        } finally {
            initializingRef.current = false;
        }
    }, []);

    const startRound = useCallback(() => {
        dispatch({ type: 'START_ROUND' });
        questionStartTimeRef.current = Date.now();
    }, []);

    // Timer Effect - Only manages the interval, reducer handles logic
    useEffect(() => {
        if (state.phase !== GamePhase.PLAYING) return;

        if (state.timeLeft > 0) {
            timerRef.current = setInterval(() => {
                dispatch({ type: 'TICK' });
            }, 1000);

            return () => {
                if (timerRef.current) clearInterval(timerRef.current);
            };
        } else if (state.timeLeft === 0 && !selfAnswered) {
            // Time's up - dispatch TIME_UP action
            dispatch({ type: 'TIME_UP' });
        }
    }, [state.phase, state.timeLeft, selfAnswered]);

    // Auto-advance after both answered
    useEffect(() => {
        if (state.phase === GamePhase.RESOLVING && selfAnswered && opponentAnswered) {
            const timer = setTimeout(() => {
                moveToNextQuestion();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [state.phase, selfAnswered, opponentAnswered]);

    // Check if last question and finish game
    const moveToNextQuestion = useCallback(() => {
        const isLastQuestion = state.currentQuestionIndex >= (state.session?.questions.length || 0) - 1;

        if (isLastQuestion) {
            submitBatchAnswers(state.session?.matchId || '');
            dispatch({ type: 'FINISH_GAME' }); // No payload needed
        } else {
            dispatch({ type: 'PREPARE_NEXT_ROUND' });
        }
    }, [state.currentQuestionIndex, state.session]);

    // Self answer handler - simplified, reducer does validation
    const handleSelfAnswer = useCallback((answer: string) => {
        if (state.phase !== GamePhase.PLAYING) return;
        if (selfAnswered) return;
        if (!state.session) return;

        const question = state.session.questions[state.currentQuestionIndex];

        // Track for batch submission (need isCorrect for server)
        const isCorrect = answer !== '' && validateAnswerPure(state, answer);
        answersBufferRef.current.push({
            questionId: question.id,
            answer,
            responseTimeMs: Date.now() - questionStartTimeRef.current,
            isCorrect,
            playerId: 'self',
        });

        dispatch({
            type: 'SUBMIT_ANSWER',
            payload: { playerId: 'self', answer }
        });
    }, [state.phase, state.session, state.currentQuestionIndex, selfAnswered]);

    // Opponent answer handler
    const handleOpponentAnswer = useCallback((answer: string) => {
        if (state.phase !== GamePhase.PLAYING && state.phase !== GamePhase.RESOLVING) return;
        if (opponentAnswered) return;
        if (!state.session) return;

        const question = state.session.questions[state.currentQuestionIndex];
        const isCorrect = validateAnswerPure(state, answer);

        answersBufferRef.current.push({
            questionId: question.id,
            answer,
            responseTimeMs: 2000 + Math.random() * 2000,
            isCorrect,
            playerId: 'opponent',
        });

        dispatch({
            type: 'SUBMIT_ANSWER',
            payload: { playerId: 'opponent', answer }
        });
    }, [state.phase, state.session, state.currentQuestionIndex, opponentAnswered]);

    // Batch submit to server
    const submitBatchAnswers = async (matchId: string) => {
        if (!matchId || answersBufferRef.current.length === 0) return;

        try {
            const serverAnswers = answersBufferRef.current.map(a => ({
                questionId: a.questionId,
                answer: a.answer,
                responseTimeMs: a.responseTimeMs,
                isCorrect: a.isCorrect,
                playerId: a.playerId === 'self'
                    ? (state.self?.id || 'player_1')
                    : (state.opponent?.id || 'bot_1')
            }));

            await submitAllAnswers(matchId, serverAnswers);
        } catch (err) {
            console.error('Batch submission failed:', err);
        }
    };

    return {
        state: {
            ...state,
            selfAnswered,
            opponentAnswered
        },
        initGame,
        startRound,
        handleAnswer: handleSelfAnswer,
        handleSelfAnswer,
        handleOpponentAnswer,
        handleBotAnswer: handleOpponentAnswer,
    };
}
