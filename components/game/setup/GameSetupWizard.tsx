'use client';

import { AnimatePresence } from 'framer-motion';
import { useGameSetupStore } from '@/store/game-setup';
import { LanguageSelector } from './LanguageSelector';
import { ModeSelector } from './ModeSelector';
import { Lobby } from '../Lobby';

export function GameSetupWizard() {
    const { step } = useGameSetupStore();

    return (
        <div className="min-h-screen bg-white overflow-x-hidden selection:bg-primary/30">
            {/* Dynamic Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
            </div>

            <AnimatePresence mode="wait">
                {step === 'LANG' && <LanguageSelector key="lang" />}
                {step === 'MODE' && <ModeSelector key="mode" />}
                {step === 'LOBBY' && <Lobby key="lobby" />}
            </AnimatePresence>
        </div>
    );
}
