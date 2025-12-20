'use client';

import { motion } from 'framer-motion';
import { useGameSetupStore, type GameMode } from '@/store/game-setup';
import { TargetLanguage } from '@/generated/prisma';

const MODES: { id: GameMode; title: string; desc: string; icon: string; comingSoon?: boolean }[] = [
    { id: 'SOLO', title: 'Solo Practice', desc: 'Sharpen your skills alone', icon: '🎯' },
    { id: 'BOT', title: 'Bot Duel', desc: 'Battle against RiceBot', icon: '🤖' },
    { id: 'MULTI', title: 'Ranked', desc: 'Compete globally', icon: '🏆', comingSoon: true },
];

export function ModeSelector() {
    const { selectedLang, selectedMode, selectedRank, setMode, setRank, setStep, goBack } = useGameSetupStore();

    const handleStart = () => {
        if (selectedMode === 'SOLO') {
            setStep('LOBBY'); // Solo also goes to lobby for data fetching
        } else if (selectedMode === 'BOT') {
            setStep('LOBBY');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="w-full max-w-4xl mx-auto px-4 py-20"
        >
            <div className="flex items-center justify-between mb-12">
                <button
                    onClick={goBack}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-6 py-2 rounded-full transition-colors"
                >
                    ← Back
                </button>
                <h2 className="text-3xl font-bold text-slate-800 uppercase tracking-widest">
                    {selectedLang} MODE
                </h2>
                <div className="w-20" /> {/* Spacer */}
            </div>

            <div className="space-y-12">
                {/* Rank Slider */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-semibold text-slate-900">Difficulty Level</h3>
                        <span className="text-4xl font-bold text-primary">Rank {selectedRank}</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="6"
                        value={selectedRank}
                        onChange={(e) => setRank(parseInt(e.target.value))}
                        className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between mt-4 text-slate-400 text-sm">
                        <span>Beginner</span>
                        <span>Expert</span>
                    </div>
                </div>

                {/* Mode Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {MODES.map((mode) => (
                        <motion.div
                            key={mode.id}
                            whileHover={mode.comingSoon ? {} : { scale: 1.05, y: -5 }}
                            whileTap={mode.comingSoon ? {} : { scale: 0.95 }}
                            onClick={() => !mode.comingSoon && setMode(mode.id)}
                            className={`
                relative p-8 rounded-3xl border-2 transition-all cursor-pointer
                ${selectedMode === mode.id
                                    ? 'bg-primary/5 border-primary shadow-[0_10px_30px_rgba(24,153,214,0.1)]'
                                    : 'bg-white border-slate-100 hover:border-slate-300'}
                ${mode.comingSoon ? 'opacity-50 cursor-not-allowed' : ''}
              `}
                        >
                            <span className="text-5xl mb-4 block">{mode.icon}</span>
                            <h4 className={`text-2xl font-bold mb-2 ${selectedMode === mode.id ? 'text-primary' : 'text-slate-900'}`}>{mode.title}</h4>
                            <p className="text-slate-500 text-sm">{mode.desc}</p>

                            {mode.comingSoon && (
                                <span className="absolute top-4 right-4 bg-slate-100 text-[10px] px-2 py-1 rounded text-slate-400 font-bold uppercase tracking-tighter">
                                    Soon
                                </span>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Start Button */}
                <motion.button
                    whileHover={{ scale: 1.02, translateY: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStart}
                    className="w-full py-6 bg-primary rounded-2xl text-white text-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all"
                >
                    Battle Start
                </motion.button>
            </div>
        </motion.div>
    );
}
