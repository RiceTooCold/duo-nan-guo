'use client'

import { motion } from 'framer-motion'

interface StatusBubbleProps {
    text: string
    variant?: 'thinking' | 'waiting' | 'correct' | 'incorrect' | 'default'
    direction?: 'left' | 'right'
    className?: string
}

export function StatusBubble({
    text,
    variant = 'default',
    direction = 'right',
    className = ''
}: StatusBubbleProps) {

    const getBubbleColor = () => {
        switch (variant) {
            case 'correct':
                return 'bg-[#22c55e] text-white'
            case 'incorrect':
                return 'bg-[#ef4444] text-white'
            case 'waiting':
                return 'bg-[#e2e8f0] text-[#64748b]'
            case 'thinking':
                return 'bg-[#f1f5f9] text-[#64748b] border-[#cbd5e1] border'
            default:
                return 'bg-white text-[#333]'
        }
    }

    // Tail positioning
    // If direction is right (bubble is to the right of avatar), tail should be on left
    // If direction is left (bubble is to the left of avatar), tail should be on right
    const isRight = direction === 'right'

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`relative px-3 py-1.5 rounded-2xl text-xs text-center font-bold shadow-sm whitespace-nowrap z-10 ${getBubbleColor()} ${className}`}
        >
            {/* Tail */}
            <div
                className={`-z-50 absolute bottom-0 w-5 h-5 transform rotate-45 ${getBubbleColor()}
          ${isRight ? '-left-1 translate-x-1/2' : '-right-1 -translate-x-1/2'}
            `}
            />
            <span className="z-50 text-md text-center font-bold">{text}</span>
        </motion.div>
    )
}
