'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface CountdownOverlayProps {
  isVisible: boolean
  number: number
}

export function CountdownOverlay({ isVisible, number }: CountdownOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 bg-[#5B8BD4]/95 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.span
            key={number}
            className="text-9xl font-black text-white"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {number === 0 ? 'GO!' : number}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

