'use client';

import { useEffect, useRef } from 'react';
import { GamePhase, type ClientQuestion } from '@/types/game';
import { getBotAnswer } from '@/actions/bot.server';

interface UseBotProps {
    phase: GamePhase;
    currentQuestion: ClientQuestion | undefined;
    onAnswer: (answer: string) => void;
    isEnabled?: boolean;
    matchId?: string;
    botDifficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Hook to manage LLM Bot behavior during the game.
 * Calls server action to get Gemini's answer for each question.
 */
export function useBot({
    phase,
    currentQuestion,
    onAnswer,
    isEnabled = true,
    matchId,
    botDifficulty = 'medium',
}: UseBotProps) {
    // Keep a ref to the latest callback to avoid restarting the effect
    const onAnswerRef = useRef(onAnswer);
    useEffect(() => {
        onAnswerRef.current = onAnswer;
    });

    // Track whether bot has answered current question
    const hasAnsweredRef = useRef(false);
    // Track if we're currently fetching
    const isFetchingRef = useRef(false);

    useEffect(() => {
        // Reset when moving to a new question (READY resets for new question)
        if (phase === GamePhase.READY || phase === GamePhase.IDLE) {
            hasAnsweredRef.current = false;
            isFetchingRef.current = false;
            return;
        }

        // Bot can start thinking during PLAYING or RESOLVING
        if (phase !== GamePhase.PLAYING && phase !== GamePhase.RESOLVING) {
            return;
        }
        if (!isEnabled || !currentQuestion || hasAnsweredRef.current || isFetchingRef.current) {
            return;
        }

        // Start fetching LLM answer
        isFetchingRef.current = true;

        const fetchBotAnswer = async () => {
            try {
                // Call LLM Bot server action
                const { answer, thinkingMs } = await getBotAnswer(
                    matchId || 'unknown',
                    currentQuestion.id,
                    botDifficulty
                );

                // Check if still valid to answer
                if (hasAnsweredRef.current) return;

                // Wait for remaining "thinking" time for natural feel
                // (Some time already passed during API call)
                const minDelay = Math.max(500, thinkingMs - 1000);

                setTimeout(() => {
                    if (hasAnsweredRef.current) return;
                    hasAnsweredRef.current = true;
                    onAnswerRef.current(answer);
                }, minDelay);

            } catch (error) {
                console.error('Bot answer fetch failed:', error);
                // Fallback to random answer
                if (!hasAnsweredRef.current) {
                    const keys = Object.keys(currentQuestion.options);
                    const randomKey = keys[Math.floor(Math.random() * keys.length)];
                    hasAnsweredRef.current = true;
                    onAnswerRef.current(randomKey);
                }
            } finally {
                isFetchingRef.current = false;
            }
        };

        fetchBotAnswer();

    }, [phase, currentQuestion, isEnabled, matchId, botDifficulty]);
}
