'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trophy, Target, Zap, RotateCcw, Home } from 'lucide-react'
import confetti from 'canvas-confetti'
import { Avatar } from '@/components/game/Avatar'
import { useGameResultStore } from '@/lib/game-engine/useGameResultStore'

export default function ResultsPage() {
  const router = useRouter()
  const result = useGameResultStore((s) => s.result)
  const clearResult = useGameResultStore((s) => s.clearResult)
  const [showStats, setShowStats] = useState(false)

  // Redirect if no result (e.g., direct navigation)
  useEffect(() => {
    if (!result) {
      router.replace('/room')
    }
  }, [result, router])

  useEffect(() => {
    if (!result) return

    // Show stats with delay
    const timer = setTimeout(() => setShowStats(true), 500)

    // Confetti effect for win
    if (result.isWin) {
      const duration = 3000
      const end = Date.now() + duration

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ['#A9C4EB', '#5B8BD4', '#D5E3F7']
        })
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ['#A9C4EB', '#5B8BD4', '#D5E3F7']
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }
      frame()
    }

    return () => clearTimeout(timer)
  }, [result])

  // Clear result when leaving page (optional: keep for "再玩一局")
  useEffect(() => {
    return () => {
      // Don't clear on unmount - let it persist for potential "view again"
      // clearResult()
    }
  }, [])

  // Handle play again - clear result and navigate
  const handlePlayAgain = () => {
    clearResult()
    router.push('/room')
  }

  const handleGoHome = () => {
    clearResult()
    router.push('/profile')
  }

  // Loading / Redirect state
  if (!result) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#5B8BD4] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#64748b] font-bold">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-[#A9C4EB]/30 via-white to-[#D5E3F7]/30 px-4 py-8">
      {/* Result Title */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        {result.isWin ? (
          <>
            <motion.div
              className="text-6xl mb-4"
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              🎉
            </motion.div>
            <h1 className="text-4xl font-black text-[#333] mb-2">
              勝利！
            </h1>
            <p className="text-[#64748b]">太棒了！你贏得了這場對戰！</p>
          </>
        ) : (
          <>
            <motion.div
              className="text-6xl mb-4"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              💪
            </motion.div>
            <h1 className="text-4xl font-black text-[#333] mb-2">
              再接再厲！
            </h1>
            <p className="text-[#64748b]">別灰心，下次一定能贏！</p>
          </>
        )}
      </motion.div>

      {/* Score Comparison */}
      <motion.div
        className="game-card p-6 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between">
          {/* Player */}
          <div className="text-center flex-1">
            <div className="mb-2 flex justify-center">
              <Avatar
                src={result.playerAvatar || "/mascot-parrot.jpg"}
                alt="Player"
                fallback="🦜"
                size="md"
              />
            </div>
            <p className="text-sm text-[#64748b] mb-1">{result.playerName}</p>
            <motion.p
              className="text-3xl font-black text-[#5B8BD4]"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
            >
              {result.playerScore}
            </motion.p>
          </div>

          {/* VS */}
          <div className="px-4">
            <span className="text-2xl font-bold text-[#64748b]">VS</span>
          </div>

          {/* Bot */}
          <div className="text-center flex-1">
            <div className="mb-2 flex justify-center">
              <Avatar
                src={result.botAvatar || "/mascot-robot.jpg"}
                alt="Bot"
                fallback="🤖"
                size="md"
              />
            </div>
            <p className="text-sm text-[#64748b] mb-1">{result.botName}</p>
            <motion.p
              className="text-3xl font-black text-[#333]/50"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' }}
            >
              {result.botScore}
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Statistics */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            className="space-y-4 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {/* Accuracy Progress */}
            <div className="game-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#5B8BD4]" />
                  <span className="font-semibold text-[#333]">準確率</span>
                </div>
                <span className="text-lg font-bold text-[#5B8BD4]">{result.accuracy}%</span>
              </div>
              <div className="h-3 bg-[#D5E3F7] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#5B8BD4] to-[#A9C4EB] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${result.accuracy}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
              <p className="text-sm text-[#64748b] mt-2">
                {result.correctAnswers} / {result.totalQuestions} 正確
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Language */}
              <motion.div
                className="game-card p-4 text-center"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Trophy className="w-8 h-8 text-[#f59e0b] mx-auto mb-2" />
                <p className="text-2xl font-bold text-[#333]">{result.language}</p>
                <p className="text-xs text-[#64748b]">{result.level}</p>
              </motion.div>

              <motion.div
                className="game-card p-4 text-center"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Zap className="w-8 h-8 text-[#ef4444] mx-auto mb-2" />
                <p className="text-2xl font-bold text-[#333]">{result.maxCombo}x</p>
                <p className="text-xs text-[#64748b]">最高連擊</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="mt-auto space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <motion.button
            onClick={handlePlayAgain}
            className="game-btn game-btn-primary w-full py-4 text-lg"
            style={{ boxShadow: '0 10px 25px -5px rgba(91, 139, 212, 0.3)' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RotateCcw className="w-5 h-5" />
            再玩一局
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <motion.button
            onClick={handleGoHome}
            className="game-btn game-btn-secondary w-full py-4 text-lg"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Home className="w-5 h-5" />
            回到主頁
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}
