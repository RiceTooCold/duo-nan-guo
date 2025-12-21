'use client'

import { motion } from 'framer-motion'

interface OptionCardProps {
  id: string
  text: string
  state: 'default' | 'selected' | 'correct' | 'incorrect'
  disabled?: boolean
  index: number
  onClick: () => void
}

export function OptionCard({
  id,
  text,
  state,
  disabled,
  index,
  onClick
}: OptionCardProps) {
  const stateClasses = {
    default: '',
    selected: 'selected',
    correct: 'correct',
    incorrect: 'incorrect',
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`game-option-card min-h-[50px] ${stateClasses[state]} w-full flex items-center justify-between`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="text-xl font-bold text-[#5B8BD4]">{`(${id.toUpperCase()})`}</span>
      <span className="text-lg font-medium flex-1 text-left text-[#333]">{text}</span>
    </motion.button>
  )
}

