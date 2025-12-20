'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import '@/lib/ui/styles/game-theme.css'

interface GameLayoutProps {
  children: React.ReactNode
}

export function GameLayout({ children }: GameLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-dvh bg-[#A9C4EB]/30">
      <div className="game-app game-mobile-container bg-white shadow-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="min-h-dvh"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

