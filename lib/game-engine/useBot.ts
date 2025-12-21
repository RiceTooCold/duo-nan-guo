'use client';

import { useEffect, useRef } from 'react';
import { GamePhase, type ClientQuestion } from '@/types/game';

interface UseBotProps {
    phase: GamePhase;
    currentQuestion: ClientQuestion | undefined;
    onAnswer: (answer: string) => void;
    isEnabled?: boolean;
}

/**
 * Hook to simulate Bot behavior during the game.
 */
export function useBot({ phase, currentQuestion, onAnswer, isEnabled = true }: UseBotProps) {
    const hasAnsweredRef = useRef(false);

    useEffect(() => {
        // Reset when moving to a new question (COUNTDOWN resets for new question)
        if (phase === GamePhase.COUNTDOWN || phase === GamePhase.IDLE) {
            hasAnsweredRef.current = false;
            return;
        }

        // Bot can answer during PLAYING or RESOLVING (after player answered)
        if ((phase !== GamePhase.PLAYING && phase !== GamePhase.RESOLVING) ||
            !isEnabled || !currentQuestion || hasAnsweredRef.current) {
            return;
        }

        // Simulate thinking time (2-4 seconds)
        const delay = Math.floor(Math.random() * 2000) + 2000;

        const timeout = setTimeout(() => {
            if ((phase !== GamePhase.PLAYING && phase !== GamePhase.RESOLVING) || hasAnsweredRef.current) return;

            const keys = Object.keys(currentQuestion.options);
            if (keys.length === 0) return;

            // Randomly pick an option
            const randomKey = keys[Math.floor(Math.random() * keys.length)];

            hasAnsweredRef.current = true;
            onAnswer(randomKey);
        }, delay);

        return () => clearTimeout(timeout);
    }, [phase, currentQuestion, isEnabled, onAnswer]);
}
