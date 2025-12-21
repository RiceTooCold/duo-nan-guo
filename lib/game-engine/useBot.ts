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
    // Keep a ref to the latest callback to avoid restarting the effect
    const onAnswerRef = useRef(onAnswer);
    useEffect(() => {
        onAnswerRef.current = onAnswer;
    });

    // Track whether bot has answered current question
    const hasAnsweredRef = useRef(false);

    useEffect(() => {
        // Reset when moving to a new question (READY resets for new question)
        if (phase === GamePhase.READY || phase === GamePhase.IDLE) {
            hasAnsweredRef.current = false;
            return;
        }

        // Bot can start thinking during PLAYING or RESOLVING
        // This prevents the bot from missing its chance to answer if the player
        // answers quickly and phase transitions to RESOLVING
        if (phase !== GamePhase.PLAYING && phase !== GamePhase.RESOLVING) {
            return;
        }
        if (!isEnabled || !currentQuestion || hasAnsweredRef.current) {
            return;
        }

        // Simulate thinking time (2-4 seconds)
        const delay = Math.floor(Math.random() * 2000) + 2000;

        const timeout = setTimeout(() => {
            // Check current status one last time
            if (hasAnsweredRef.current) return;

            // Note: We don't check phase here rigidly because if the phase moved to RESOLVING
            // (e.g. user answered 0.1s ago), the bot should still likely submit its answer
            // to show "simultaneous" play, or we can enforce proper phase checks.
            // For now, let's allow it to answer if it was thinking.

            const keys = Object.keys(currentQuestion.options);
            if (keys.length === 0) return;

            // Randomly pick an option
            const randomKey = keys[Math.floor(Math.random() * keys.length)];

            hasAnsweredRef.current = true;
            onAnswerRef.current(randomKey);
        }, delay);

        return () => clearTimeout(timeout);
    }, [phase, currentQuestion, isEnabled]); // Removed onAnswer to prevent timer reset on tick
}
