'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Trophy, Target, Zap, RotateCcw, Home } from 'lucide-react'
import confetti from 'canvas-confetti'
import { Avatar } from './components/Avatar'

// Mock results data
const mockResults = {
  isWin: true,
  playerScore: 850,
  botScore: 620,
  correctAnswers: 8,
  totalQuestions: 10,
  accuracy: 80,
  earnedPoints: 150,
  combo: 5,
  language: 'ko',
  level: '1級',
}

export function ResultsScreen() {
  const [showStats, setShowStats] = useState(false)

  useEffect(() => {
    // Show stats with delay
    const timer = setTimeout(() => setShowStats(true), 500)
    
    // Confetti effect for win
    if (mockResults.isWin) {
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
  }, [])

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-[#A9C4EB]/30 via-white to-[#D5E3F7]/30 px-4 py-8">
      {/* Result Title */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        {mockResults.isWin ? (
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
                src="/mascot-parrot.png"
                alt="Player"
                fallback="🦜"
                size="md"
              />
            </div>
            <p className="text-sm text-[#64748b] mb-1">你</p>
            <motion.p
              className="text-3xl font-black text-[#5B8BD4]"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
            >
              {mockResults.playerScore}
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
                src="/mascot-robot.png"
                alt="Bot"
                fallback="🤖"
                size="md"
              />
            </div>
            <p className="text-sm text-[#64748b] mb-1">AI Bot</p>
            <motion.p
              className="text-3xl font-black text-[#333]/50"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' }}
            >
              {mockResults.botScore}
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
                <span className="text-lg font-bold text-[#5B8BD4]">{mockResults.accuracy}%</span>
              </div>
              <div className="h-3 bg-[#D5E3F7] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#5B8BD4] to-[#A9C4EB] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${mockResults.accuracy}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
              <p className="text-sm text-[#64748b] mt-2">
                {mockResults.correctAnswers} / {mockResults.totalQuestions} 正確
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                className="game-card p-4 text-center"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Trophy className="w-8 h-8 text-[#f59e0b] mx-auto mb-2" />
                <p className="text-2xl font-bold text-[#333]">+{mockResults.earnedPoints}</p>
                <p className="text-xs text-[#64748b]">獲得積分</p>
              </motion.div>
              
              <motion.div
                className="game-card p-4 text-center"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Zap className="w-8 h-8 text-[#ef4444] mx-auto mb-2" />
                <p className="text-2xl font-bold text-[#333]">{mockResults.combo}x</p>
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
          <Link href="/room">
            <motion.button
              className="game-btn game-btn-primary w-full py-4 text-lg"
              style={{ boxShadow: '0 10px 25px -5px rgba(91, 139, 212, 0.3)' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RotateCcw className="w-5 h-5" />
              再玩一局
            </motion.button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Link href="/profile">
            <motion.button
              className="game-btn game-btn-secondary w-full py-4 text-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Home className="w-5 h-5" />
              回到主頁
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}

