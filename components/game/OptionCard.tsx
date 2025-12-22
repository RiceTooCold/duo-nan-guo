'use client'

import { motion } from 'framer-motion'

interface OptionCardProps {
  id: string
  text: string
  state: 'default' | 'selected' | 'correct' | 'incorrect'
  disabled?: boolean
  index: number
  onClick: () => void
  /** Show self badge (avatar) on this option */
  selfBadge?: { avatar?: string | null; fallback: string } | null
  /** Show opponent badge (avatar) on this option */
  opponentBadge?: { avatar?: string | null; fallback: string } | null
}

export function OptionCard({
  id,
  text,
  state,
  disabled,
  index,
  onClick,
  selfBadge,
  opponentBadge,
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
      className={`game-option-card min-h-[50px] ${stateClasses[state]} w-full flex items-center justify-between relative`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="text-xl font-bold text-[#5B8BD4]">{`(${id.toUpperCase()})`}</span>
      <span className="text-lg font-medium flex-1 text-left text-[#333]">{text}</span>

      {/* Player badges */}
      <div className="flex items-center gap-1 ml-2">
        {selfBadge && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-6 h-6 rounded-full overflow-hidden border-2 border-[#5B8BD4] bg-white flex items-center justify-center text-xs"
          >
            {selfBadge.avatar ? (
              <img src={selfBadge.avatar} alt="You" className="w-full h-full object-cover" />
            ) : (
              <span>{selfBadge.fallback}</span>
            )}
          </motion.div>
        )}
        {opponentBadge && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-6 h-6 rounded-full overflow-hidden border-2 border-[#ef4444] bg-white flex items-center justify-center text-xs"
          >
            {opponentBadge.avatar ? (
              <img src={opponentBadge.avatar} alt="Opponent" className="w-full h-full object-cover" />
            ) : (
              <span>{opponentBadge.fallback}</span>
            )}
          </motion.div>
        )}
      </div>
    </motion.button>
  )
}

