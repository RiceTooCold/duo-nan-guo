'use client'

import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'

interface BatteryScoreProps {
    score: number
    variant?: 'default' | 'opponent'
}

export function BatteryScore({ score, variant = 'default' }: BatteryScoreProps) {
    // Use pink for self (like example) or existing blue? 
    // User example showed pink battery. Let's use a nice pink/purple gradient.
    const isOpponent = variant === 'opponent'

    // Dynamic fill based on score? Or just full battery? 
    // User image implies it's a "Power" indicator. 
    // Let's make it a full battery that pulses or reacts to score.

    return (
        <div className="relative flex items-center justify-center">
            <motion.div
                className={`relative flex items-center justify-center px-4 py-2 rounded-2xl border-2 border-white shadow-lg overflow-hidden
          ${isOpponent
                        ? 'bg-linear-to-br from-slate-400 to-slate-500'
                        : 'bg-linear-to-br from-[#5B8BD4] to-[#4c75b5]' // Project Blue Theme
                    }
        `}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                key={score} // Pulse on score change
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

            {/* Battery Tip/Nipple */}
            {/* <div className={`absolute -right-1 w-1.5 h-4 rounded-r-md ${isOpponent ? 'bg-slate-500' : 'bg-[#ff4785]'}`} /> */}
            {/* Actually the tip might look weird if it's just a div. The example was 3D. 
          Let's just keep the rounded block style which is clean. Or add a small tip.
      */}
            <div className={`w-1.5 h-5 rounded-r-md ml-px ${isOpponent ? 'bg-slate-500' : 'bg-[#4c75b5]'}`} />
        </div>
    )
}
