'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameSetupStore } from '@/store/game-setup';
import { createGuestMatch } from '@/actions/game.server';
import { useGameLoop } from '@/lib/game-engine/useGameLoop';

export function Lobby() {
    const { selectedLang, selectedRank, selectedMode, setStep, setMatchId } = useGameSetupStore();
    const [status, setStatus] = useState('Initializing...');
    const [matchFound, setMatchFound] = useState(false);

    useEffect(() => {
        async function prepareMatch() {
            if (!selectedLang) return;

            try {
                if (selectedMode === 'BOT') {
                    setStatus('Searching for opponent...');
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate search
                    setStatus('Opponent Found: RiceBot');
                    setMatchFound(true);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    setStatus('Preparing Practice Session...');
                }

                setStatus('Fetching Questions...');
                const session = await createGuestMatch(selectedLang, selectedRank, selectedMode as 'SOLO' | 'BOT');

                setMatchId(session.matchId);

                setStatus('Ready!');
                await new Promise(resolve => setTimeout(resolve, 500));
                setStep('GAME');
            } catch (err: any) {
                setStatus(`Error: ${err.message}`);
            }
        }

        prepareMatch();
    }, [selectedLang, selectedRank, selectedMode, setStep, setMatchId]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-800">
            {/* Radar Animation */}
            <div className="relative w-64 h-64 mb-12">
                <motion.div
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border-2 border-primary/20"
                />
                <motion.div
                    animate={{ scale: [1, 2], opacity: [0.3, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border-2 border-primary/10"
                />
                <div className="absolute inset-0 rounded-full border border-slate-200 flex items-center justify-center bg-slate-50 shadow-inner">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="w-[90%] h-[90%] rounded-full border-t-2 border-primary"
                    />
                </div>

                {/* VS Indicator */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-black text-slate-900 tracking-widest italic opacity-20">VS</span>
                </div>
            </div>

            <motion.div
                key={status}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
            >
                <p className="text-xl font-medium tracking-widest text-primary uppercase mb-2">
                    {status}
                </p>
                <p className="text-slate-400 text-sm">
                    {selectedLang} • Rank {selectedRank} • {selectedMode}
                </p>
            </motion.div>

            {matchFound && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-8 flex items-center gap-8"
                >
                    <div className="text-right">
                        <p className="text-slate-900 font-bold">You</p>
                        <p className="text-slate-400 text-xs">Challenger</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shadow-sm">👤</div>
                    <div className="text-primary font-black italic">VS</div>
                    <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl shadow-lg ring-4 ring-primary/10">🤖</div>
                    <div className="text-left">
                        <p className="text-slate-900 font-bold">RiceBot</p>
                        <p className="text-slate-400 text-xs">AI Sentinel</p>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
