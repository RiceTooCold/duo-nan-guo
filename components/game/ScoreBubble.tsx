'use client'

import { motion } from 'framer-motion'

interface ScoreBubbleProps {
  score: number
  direction: 'left' | 'right'
}

export function ScoreBubble({ score, direction }: ScoreBubbleProps) {
  return (
    <div className={`game-score-bubble ${direction}`}>
      <motion.span 
        className="text-lg text-[#333]"
        key={score}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
      >
        {score} 分
      </motion.span>
    </div>
  )
}

