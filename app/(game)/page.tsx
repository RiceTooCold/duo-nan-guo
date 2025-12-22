'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/game/Avatar'
import { Lock, Gamepad2, Settings, X } from 'lucide-react'

export default function HomePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  const handleAdminAccess = () => {
    // Check password (from environment variable)
    if (adminPassword === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      router.push('/admin')
    } else {
      setPasswordError(true)
      setTimeout(() => setPasswordError(false), 2000)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-white via-[#D5E3F7]/30 to-[#A9C4EB]/20 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-20 h-20 bg-[#A9C4EB]/20 rounded-full blur-xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ repeat: Infinity, duration: 4 }}
        />
        <motion.div
          className="absolute bottom-32 right-8 w-32 h-32 bg-[#D5E3F7]/40 rounded-full blur-2xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.6, 0.4]
          }}
          transition={{ repeat: Infinity, duration: 5, delay: 1 }}
        />
        <motion.div
          className="absolute top-1/3 right-4 w-16 h-16 bg-[#5B8BD4]/10 rounded-full blur-lg"
          animate={{
            y: [0, -20, 0],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ repeat: Infinity, duration: 3 }}
        />
      </div>

      {/* Logo / Title */}
      <motion.div
        className="text-center mb-8 z-10"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-5xl font-black text-[#333] tracking-tight mb-2">
          Dun<span className="text-[#5B8BD4]">Nan</span>Guo
        </h1>
        <p className="text-lg text-[#64748b] font-medium">
          多難過 · 語言學習對戰
        </p>
      </motion.div>

      {/* Mascot - Parrot with floating animation */}
      <motion.div
        className="relative w-48 h-48 mb-10 z-10"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <motion.div
          className="w-full h-full"
          animate={{ y: [0, -12, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        >
          <img
            src="/mascot-parrot-crying.png"
            alt="DunNanGuo Parrot Mascot"
            width={200}
            height={200}
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Sparkle effects around mascot */}
        <motion.div
          className="absolute -top-2 -right-2 text-2xl"
          animate={{
            rotate: [0, 20, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          ✨
        </motion.div>
        <motion.div
          className="absolute bottom-4 -left-4 text-xl"
          animate={{
            rotate: [0, -20, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }}
        >
          ⭐
        </motion.div>
      </motion.div>

      {/* Supported Languages */}
      <motion.div
        className="flex gap-3 mb-10 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {['🇯🇵', '🇺🇸', '🇰🇷', '🇨🇳'].map((flag, index) => (
          <motion.span
            key={flag}
            className="w-12 h-12 bg-white rounded-2xl shadow-md flex items-center justify-center text-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            {flag}
          </motion.span>
        ))}
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        className="w-full max-w-xs z-10 flex flex-col gap-3"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        {/* Play Game Button */}
        <Link href={session ? "/room" : "/login"}>
          <motion.button
            className="game-btn game-btn-primary w-full py-4 text-lg shadow-lg flex items-center justify-center gap-2"
            style={{ boxShadow: '0 10px 25px -5px rgba(91, 139, 212, 0.3)' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Gamepad2 className="w-5 h-5" />
            {session ? '開始遊戲' : '登入 / 開始遊戲'}
          </motion.button>
        </Link>

        {/* Admin Button */}
        <motion.button
          onClick={() => setShowAdminModal(true)}
          className="game-btn game-btn-secondary w-full py-3 text-base flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Settings className="w-4 h-4" />
          管理後台
        </motion.button>
      </motion.div>

      {/* Footer text */}
      <motion.p
        className="mt-8 text-sm text-[#64748b] z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        JLPT · TOEIC · TOPIK · HSK
      </motion.p>

      {/* Admin Password Modal */}
      <AnimatePresence>
        {showAdminModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAdminModal(false)}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#333] flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#5B8BD4]" />
                  管理員登入
                </h2>
                <button
                  onClick={() => setShowAdminModal(false)}
                  className="text-[#64748b] hover:text-[#333]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminAccess()}
                  placeholder="輸入管理員密碼"
                  className={`game-input w-full ${passwordError ? 'border-red-400 animate-shake' : ''}`}
                  autoFocus
                />

                {passwordError && (
                  <motion.p
                    className="text-red-500 text-sm"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    密碼錯誤，請重試
                  </motion.p>
                )}

                <motion.button
                  onClick={handleAdminAccess}
                  className="game-btn game-btn-primary w-full py-3"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  進入後台
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
