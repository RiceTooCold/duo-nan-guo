'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Trophy, Target, Zap, RotateCcw, Home } from 'lucide-react'
import confetti from 'canvas-confetti'
import { Avatar } from '@/components/game/Avatar'
import { useGameResultStore } from '@/lib/game-engine/useGameResultStore'

export default function ResultsPage() {
  const router = useRouter()
  const result = useGameResultStore((s) => s.result)
  const [showStats, setShowStats] = useState(false)

  useEffect(() => {
    if (!result) return

    // Show stats with delay
    const timer = setTimeout(() => setShowStats(true), 500)

    // Confetti effect for win
    if (result.outcome === 'win') {
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

  // Navigate to play again
  const handlePlayAgain = () => {
    router.push('/room')
  }

  // Navigate to lobby
  const handleGoHome = () => {
    router.push('/lobby')
  }

  // No result state - direct navigation without playing
  if (!result) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[#F5F8FC] p-4">
        <p className="text-[#64748b] mb-4">尚無對戰結果</p>
        <button
          onClick={() => router.push('/room')}
          className="text-[#5B8BD4] font-semibold"
        >
          前往開始對戰 →
        </button>
      </div>
    )
  }

  // Outcome display config
  const outcomeConfig = {
    win: {
      emoji: '🎉',
      title: '勝利！',
      subtitle: '太棒了！你贏得了這場對戰！',
      animation: { rotate: [0, -10, 10, -10, 0] },
    },
    lose: {
      emoji: '💪',
      title: '再接再厲！',
      subtitle: '別灰心，下次一定能贏！',
      animation: { y: [0, -10, 0] },
    },
    tie: {
      emoji: '🤝',
      title: '平手！',
      subtitle: '勢均力敵！真是一場精彩的對決！',
      animation: { scale: [1, 1.1, 1] },
    },
  }

  const config = outcomeConfig[result.outcome]

  return (
    <div className="min-h-dvh flex flex-col bg-linear-to-b from-[#A9C4EB]/30 via-white to-[#D5E3F7]/30 px-4 py-8">
      {/* Result Title */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        <motion.div
          className="text-6xl mb-4"
          animate={config.animation}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {config.emoji}
        </motion.div>
        <h1 className="text-4xl font-black text-[#333] mb-2">
          {config.title}
        </h1>
        <p className="text-[#64748b]">{config.subtitle}</p>
      </motion.div>

      {/* Score Comparison - Symmetric self vs opponent */}
      <motion.div
        className="game-card p-6 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between">
          {/* Self (Left) */}
          <div className="text-center flex-1">
            <div className="mb-2 flex justify-center">
              <Avatar
                src={result.self.avatar || "/mascot-parrot.jpg"}
                alt="Player"
                fallback={result.self.name.charAt(0) || '🦜'}
                size="md"
              />
            </div>
            <p className="text-sm text-[#64748b] mb-1">{result.self.name}</p>
            <motion.p
              className="text-3xl font-black text-[#5B8BD4]"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
            >
              {result.self.score}
            </motion.p>
          </div>

          {/* VS */}
          <div className="px-4">
            <span className="text-2xl font-bold text-[#64748b]">VS</span>
          </div>

          {/* Opponent (Right) */}
          <div className="text-center flex-1">
            <div className="mb-2 flex justify-center">
              <Avatar
                src={result.opponent.avatar || "/mascot-robot.jpg"}
                alt="Opponent"
                fallback={result.opponent.isBot ? '🤖' : (result.opponent.name.charAt(0) || 'O')}
                size="md"
              />
            </div>
            <p className="text-sm text-[#64748b] mb-1">{result.opponent.name}</p>
            <motion.p
              className="text-3xl font-black text-[#333]/50"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' }}
            >
              {result.opponent.score}
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
                <span className="text-lg font-bold text-[#5B8BD4]">{result.self.accuracy}%</span>
              </div>
              <div className="h-3 bg-[#D5E3F7] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#5B8BD4] to-[#A9C4EB] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${result.self.accuracy}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
              <p className="text-sm text-[#64748b] mt-2">
                {result.self.correctAnswers} / {result.match.totalQuestions} 正確
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
                <p className="text-2xl font-bold text-[#333]">{result.match.language}</p>
                <p className="text-xs text-[#64748b]">{result.match.level}</p>
              </motion.div>

              <motion.div
                className="game-card p-4 text-center"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Zap className="w-8 h-8 text-[#ef4444] mx-auto mb-2" />
                <p className="text-2xl font-bold text-[#333]">{result.self.maxStreak}x</p>
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
