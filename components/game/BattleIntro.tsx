'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Avatar } from './Avatar'

interface BattleIntroProps {
    language: string
    level: string
    playerAvatar?: string | null
    opponentAvatar?: string | null
    playerName?: string
    opponentName?: string
    onComplete: () => void
}

export function BattleIntro({
    language,
    level,
    playerAvatar,
    opponentAvatar,
    playerName = 'You',
    opponentName = 'Opponent',
    onComplete
}: BattleIntroProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete()
        }, 3500) // Extended slightly for the longer animation

        return () => clearTimeout(timer)
    }, [onComplete])

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-white overflow-hidden"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
        >
            {/* Background Effects */}
            <div className="absolute inset-0 flex">
                <motion.div
                    className="w-1/2 h-full bg-[#f8fafc]"
                    initial={{ x: '-100%' }}
                    animate={{ x: '0%' }}
                    transition={{ duration: 0.5, ease: 'circOut' }}
                />
                <motion.div
                    className="w-1/2 h-full bg-[#f1f5f9]"
                    initial={{ x: '100%' }}
                    animate={{ x: '0%' }}
                    transition={{ duration: 0.5, ease: 'circOut' }}
                />
            </div>

            <div className="relative w-full max-w-lg mx-auto flex items-center justify-center h-full">

                {/* Player Side (Left) */}
                <motion.div
                    className="absolute left-4 md:left-12 flex flex-col items-center gap-4"
                    initial={{ x: -200, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 15, delay: 0.2 }}
                >
                    <div className="relative">
                        <div className="absolute -inset-4 bg-[#5B8BD4]/20 rounded-full blur-xl animate-pulse" />
                        <motion.div
                            animate={{ x: [0, 10, 0] }} // Subtle impact recoil
                            transition={{ delay: 0.8, duration: 0.3 }}
                        >
                            <Avatar src={playerAvatar || ''} alt={playerName} size="xl" fallback="Playing" />
                        </motion.div>
                    </div>
                    <span className="text-xl font-bold text-[#333] whitespace-nowrap">{playerName}</span>
                </motion.div>

                {/* Opponent Side (Right) */}
                <motion.div
                    className="absolute right-4 md:right-12 flex flex-col items-center gap-4"
                    initial={{ x: 200, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 15, delay: 0.2 }}
                >
                    <div className="relative">
                        <div className="absolute -inset-4 bg-red-400/20 rounded-full blur-xl animate-pulse" />
                        <motion.div
                            animate={{ x: [0, -10, 0] }} // Subtle impact recoil
                            transition={{ delay: 0.8, duration: 0.3 }}
                        >
                            <Avatar src={opponentAvatar || ''} alt={opponentName} size="xl" fallback="Bot" />
                        </motion.div>
                    </div>
                    <span className="text-xl font-bold text-[#333] whitespace-nowrap">{opponentName}</span>
                </motion.div>

                {/* Center Content */}
                <div className="z-10 flex flex-col items-center justify-center">

                    {/* INFO Tag */}
                    <motion.div
                        className="mb-8 px-4 py-1.5 bg-[#D5E3F7] rounded-full flex items-center gap-2 shadow-sm border border-[#5B8BD4]/30"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.5 }}
                    >
                        <span className="font-bold text-[#333]">{language}</span>
                        <span className="w-1 h-3 bg-[#5B8BD4]/50 rounded-full" />
                        <span className="text-[#5B8BD4] font-bold">{level}</span>
                    </motion.div>

                    {/* VS Badge */}
                    <div className="relative">
                        {/* Impact Shockwave */}
                        <motion.div
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-4 border-[#5B8BD4] rounded-full"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: [0, 2], opacity: [0.8, 0] }}
                            transition={{ delay: 0.7, duration: 0.6, ease: 'easeOut' }}
                        />
                        <motion.div
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-red-400 rounded-full"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: [0, 1.5], opacity: [0.6, 0] }}
                            transition={{ delay: 0.75, duration: 0.6, ease: 'easeOut' }}
                        />

                        <motion.div
                            className="text-8xl md:text-9xl font-black italic text-transparent bg-clip-text bg-linear-to-br from-[#5B8BD4] to-[#3b82f6] drop-shadow-2xl"
                            style={{ textShadow: '4px 4px 0px rgba(0,0,0,0.1)' }}
                            initial={{ scale: 3, opacity: 0, rotate: -45 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            transition={{
                                delay: 0.7,
                                type: "spring",
                                stiffness: 300,
                                damping: 15,
                                mass: 1.5
                            }}
                        >
                            VS
                        </motion.div>
                    </div>

                    {/* Loading/Ready Text */}
                    <motion.p
                        className="mt-12 text-lg font-bold text-[#64748b] tracking-wider"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0.5, 1] }}
                        transition={{ delay: 2, duration: 1.5, repeat: Infinity }}
                    >
                        BATTLE STARTING...
                    </motion.p>
                </div>
            </div>
        </motion.div>
    )
}
