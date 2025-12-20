'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { TargetLanguage } from '@/generated/prisma';
import { useGameSetupStore } from '@/store/game-setup';

const LANGUAGES = [
    { code: TargetLanguage.EN, name: 'English', icon: '🇺🇸', color: 'from-blue-500 to-indigo-600' },
    { code: TargetLanguage.JP, name: '日本語', icon: '🇯🇵', color: 'from-red-500 to-rose-600' },
    { code: TargetLanguage.KR, name: '한국어', icon: '🇰🇷', color: 'from-cyan-500 to-blue-600' },
    { code: TargetLanguage.CN, name: '中文', icon: '🇨🇳', color: 'from-orange-500 to-red-600' },
];

export function LanguageSelector() {
    const { selectedLang, selectLang } = useGameSetupStore();

    return (
        <div className="relative w-full max-w-6xl mx-auto px-4 py-20 flex flex-col items-center">
            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-6xl font-bold mb-12 text-slate-900 text-center"
            >
                Choose Your Language
            </motion.h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                <AnimatePresence>
                    {LANGUAGES.map((lang) => {
                        const isSelected = selectedLang === lang.code;
                        const isHidden = selectedLang !== null && !isSelected;

                        if (isHidden) return null;

                        return (
                            <motion.div
                                key={lang.code}
                                layoutId={`card-${lang.code}`}
                                onClick={() => selectLang(lang.code)}
                                className={`
                  relative cursor-pointer rounded-3xl overflow-hidden aspect-[4/5]
                  bg-gradient-to-br ${lang.color} p-8
                  flex flex-col items-center justify-center transition-shadow hover:shadow-2xl
                `}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8, x: isSelected ? 0 : (lang.code === 'EN' || lang.code === 'JP' ? -100 : 100) }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            >
                                <motion.span
                                    layoutId={`icon-${lang.code}`}
                                    className="text-8xl mb-6 block"
                                >
                                    {lang.icon}
                                </motion.span>
                                <motion.span
                                    layoutId={`text-${lang.code}`}
                                    className="text-3xl font-bold text-white uppercase tracking-widest"
                                >
                                    {lang.name}
                                </motion.span>

                                {isSelected && (
                                    <motion.button
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="absolute top-6 left-6 bg-white/20 backdrop-blur-md rounded-full px-4 py-2 text-white font-medium"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            selectLang(null);
                                        }}
                                    >
                                        ← Back
                                    </motion.button>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
