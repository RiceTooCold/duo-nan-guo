'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { useEffect, useState } from 'react'

interface BatteryScoreProps {
    score: number
    variant?: 'default' | 'opponent'
    /** Score delta from server (via Pusher) */
    lastScoreChange?: number
}

export function BatteryScore({ score, variant = 'default', lastScoreChange = 0 }: BatteryScoreProps) {
    const isOpponent = variant === 'opponent'

    // State to control animation visibility
    const [showDelta, setShowDelta] = useState(false)
    const [displayDelta, setDisplayDelta] = useState(0)

    // Trigger animation when lastScoreChange changes and is > 0
    useEffect(() => {
        if (lastScoreChange > 0) {
            setDisplayDelta(lastScoreChange)
            setShowDelta(true)
            // Hide after animation
            const timer = setTimeout(() => setShowDelta(false), 1500)
            return () => clearTimeout(timer)
        }
    }, [lastScoreChange, score]) // Include score to detect each new answer

    return (
        <div className="relative flex items-center justify-center">
            {/* Floating Score Animation */}
            <AnimatePresence>
                {showDelta && displayDelta > 0 && (
                    <motion.div
                        key={`score-diff-${score}`}
                        initial={{ opacity: 0, y: 0, scale: 0.5 }}
                        animate={{ opacity: 1, y: -35, scale: 1.2 }}
                        exit={{ opacity: 0, y: -50, scale: 1 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="absolute -top-2 z-50 pointer-events-none"
                    >
                        <span className="text-xl font-black text-amber-300 drop-shadow-lg"
                            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                        >
                            +{displayDelta}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                className={`relative flex items-center justify-center px-4 py-2 rounded-2xl border-2 border-white shadow-lg overflow-hidden
          ${isOpponent
                        ? 'bg-linear-to-br from-slate-400 to-slate-500'
                        : 'bg-linear-to-br from-[#5B8BD4] to-[#4c75b5]'
                    }
        `}
                initial={{ scale: 0.8 }}
                animate={{ scale: showDelta ? [1, 1.15, 1] : 1 }}
                key={score}
                transition={{ duration: 0.3 }}
            >
                {/* Shine effect */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 rounded-t-xl pointer-events-none" />

                {/* Lightning Icon */}
                <Zap className="w-5 h-5 text-yellow-300 mr-1 fill-yellow-300 drop-shadow-sm" />

                {/* Score Text */}
                <span className="text-xl font-black text-white drop-shadow-sm tracking-wide font-mono">
                    {score}
                </span>
            </motion.div>

            {/* Battery Tip */}
            <div className={`w-1.5 h-5 rounded-r-md ml-px ${isOpponent ? 'bg-slate-500' : 'bg-[#4c75b5]'}`} />
        </div>
    )
}
