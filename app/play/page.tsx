'use client';

import { useEffect } from 'react';
import { useGameSetupStore } from '@/store/game-setup';
import { GameSetupWizard } from '@/components/game/setup/GameSetupWizard';
import { GameInterface } from '@/components/game/GameInterface';

export default function PlayPage() {
    const { step, reset } = useGameSetupStore();

    useEffect(() => {
        // Handle browser back button
        const handlePopState = (event: PopStateEvent) => {
            if (step === 'GAME') {
                const confirmExit = window.confirm('確定要放棄本局遊戲並返回主選單嗎？');
                if (confirmExit) {
                    reset();
                } else {
                    // Push state back to prevent navigation
                    window.history.pushState(null, '', window.location.href);
                }
            }
        };

        window.addEventListener('popstate', handlePopState);

        // Push an initial state for popstate to catch the first back click
        if (step === 'GAME') {
            window.history.pushState(null, '', window.location.href);
        }

        return () => window.removeEventListener('popstate', handlePopState);
    }, [step, reset]);

    return (
        <main className="min-h-screen bg-white">
            {step === 'GAME' ? (
                <GameInterface />
            ) : (
                <GameSetupWizard />
            )}
        </main>
    );
}
