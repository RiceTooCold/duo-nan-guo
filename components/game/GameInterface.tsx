'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameLoop } from '@/lib/game-engine/useGameLoop';
import { useBot } from '@/lib/game-engine/useBot';
import { useGameSetupStore } from '@/store/game-setup';
import { GamePhase, type PlayerState } from '@/types/game';

export function GameInterface() {
    const { selectedLang, selectedRank } = useGameSetupStore();
    const { state, initGame, handleAnswer, handleBotAnswer } = useGameLoop();

    const currentQuestion = state.session?.questions[state.currentQuestionIndex];

    // Bot logic integration
    useBot({
        phase: state.phase,
        currentQuestion: currentQuestion,
        onAnswer: handleBotAnswer,
        isEnabled: state.session?.players.some((p: any) => p.isBot)
    });

    useEffect(() => {
        if (state.phase === GamePhase.IDLE && selectedLang) {
            initGame(null, { lang: selectedLang, rank: selectedRank });
        }
    }, [state.phase, selectedLang, selectedRank, initGame]);

    if (state.error) return <div className="text-red-500 p-20 text-center">{state.error}</div>;
    if (!state.session) return <div className="text-slate-800 p-20 text-center">Loading Session...</div>;

    return (
        <div className="max-w-4xl mx-auto px-4 py-12 text-slate-800">
            {/* Header Stat Bar */}
            <div className="flex justify-between items-center mb-12 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative">
                {Object.values(state.players).map((player: PlayerState) => (
                    <div key={player.id} className="flex flex-col items-center gap-2">
                        <span className="text-xs uppercase tracking-tighter text-slate-400 font-bold">{player.name}</span>
                        <div className="text-2xl font-black text-slate-900">{player.score}</div>
                        <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                                animate={{ width: `${player.health}%` }}
                                className={`h-full ${player.health > 30 ? 'bg-primary' : 'bg-destructive'}`}
                            />
                        </div>
                    </div>
                ))}

                <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="text-4xl font-black text-primary tabular-nums">{state.timeLeft}</div>
                    <span className="text-[10px] uppercase text-slate-400 font-bold">Seconds</span>
                </div>
            </div>

            {/* Question Card */}
            <motion.div
                key={state.currentQuestionIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2.5rem] p-12 border border-slate-200 shadow-xl mb-8 min-h-[300px] flex flex-col items-center justify-center text-center"
            >
                <span className="text-primary font-bold mb-4 block uppercase tracking-widest text-sm">Question {state.currentQuestionIndex + 1} of {state.session.questions.length}</span>
                <h2 className="text-3xl md:text-4xl font-bold leading-tight text-slate-900">
                    {currentQuestion?.stimulus}
                </h2>
            </motion.div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion && Object.entries(currentQuestion.options).map(([key, value]) => (
                    <motion.button
                        key={key}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAnswer(key)}
                        disabled={state.phase !== GamePhase.PLAYING}
                        className={`
                p-6 rounded-2xl text-left text-xl font-medium transition-all border-2
                ${state.phase === GamePhase.PLAYING
                                ? 'bg-white border-slate-100 text-slate-700 hover:border-primary hover:text-primary shadow-sm'
                                : 'bg-slate-50 border-transparent opacity-50 cursor-not-allowed'}
            `}
                    >
                        <span className="inline-block w-8 h-8 rounded-lg bg-slate-100 text-slate-900 text-center mr-4 text-sm font-bold leading-8">{key.toUpperCase()}</span>
                        {value as string}
                    </motion.button>
                ))}
            </div>

            {/* Feedback Overlay */}
            {state.phase === GamePhase.RESOLVING && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 pointer-events-none flex items-center justify-center bg-white/40 backdrop-blur-sm z-50"
                >
                    <motion.div
                        key={state.lastResult ? 'result' : 'checking'}
                        initial={{ scale: 0.5, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className={`text-8xl md:text-9xl font-black italic drop-shadow-xl ${state.lastResult
                            ? state.lastResult.isCorrect ? 'text-primary' : 'text-destructive'
                            : 'text-slate-400 opacity-50'
                            }`}
                    >
                        {state.lastResult
                            ? state.lastResult.isCorrect ? 'CORRECT!' : 'WRONG!'
                            : 'CHECKING...'}
                    </motion.div>
                </motion.div>
            )}

            {/* Result Overlay */}
            {state.phase === GamePhase.FINISHED && (
                <div className="fixed inset-0 bg-white/95 backdrop-blur-3xl flex flex-col items-center justify-center z-[100] text-center p-8">
                    <motion.h2
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-6xl md:text-8xl font-black mb-4 italic tracking-tighter"
                    >
                        {state.winnerId === 'player_1' ? <span className="text-primary">VICTORY</span> : <span className="text-destructive">DEFEAT</span>}
                    </motion.h2>
                    <p className="text-slate-500 text-xl font-medium mb-12">Final Score: {state.players['player_1'].score}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-12 py-4 bg-primary text-white font-bold rounded-full hover:scale-105 transition-transform shadow-lg shadow-primary/20"
                    >
                        Play Again
                    </button>
                </div>
            )}
        </div>
    );
}
