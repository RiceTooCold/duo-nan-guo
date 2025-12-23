'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Lock, Gamepad2, Settings, X, Sparkles, Star, Globe } from 'lucide-react'
import Image from 'next/image'

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

  // Language codes for display instead of flags
  const languages = [
    { code: 'JP', label: '日文' },
    { code: 'EN', label: '英文' },
    { code: 'KR', label: '韓文' },
    { code: 'CN', label: '中文' }
  ]

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 bg-linear-to-b from-white via-(--game-secondary)/30 to-(--game-primary)/20 relative overflow-hidden font-sans">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-20 h-20 bg-(--game-primary)/20 rounded-full blur-xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ repeat: Infinity, duration: 4 }}
        />
        <motion.div
          className="absolute bottom-32 right-8 w-32 h-32 bg-(--game-secondary)/40 rounded-full blur-2xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.6, 0.4]
          }}
          transition={{ repeat: Infinity, duration: 5, delay: 1 }}
        />
        <motion.div
          className="absolute top-1/3 right-4 w-16 h-16 bg-(--game-accent)/10 rounded-full blur-lg"
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
        <h1 className="text-5xl font-black text-(--game-fg) tracking-tight mb-2 drop-shadow-sm">
          Dun<span className="text-(--game-accent)">Nan</span>Guo
        </h1>
        <p className="text-lg text-(--game-muted-fg) font-bold tracking-wide">
          多難過 · 語言學習對戰
        </p>
      </motion.div>

      {/* Mascot - with updated decorations */}
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
          <Image
            src="/mascot-parrot-crying.png"
            alt="DunNanGuo Parrot Mascot"
            width={200}
            height={200}
            className="w-full h-full object-cover drop-shadow-xl"
          />
        </motion.div>

        {/* Lucide Icon Decorations */}
        <motion.div
          className="absolute -top-2 -right-2 text-(--game-warning)"
          animate={{
            rotate: [0, 20, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Sparkles className="w-8 h-8 fill-current text-yellow-400" />
        </motion.div>

        <motion.div
          className="absolute bottom-4 -left-4 text-(--game-accent)"
          animate={{
            rotate: [0, -20, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }}
        >
          <Star className="w-6 h-6 fill-current text-blue-400" />
        </motion.div>
      </motion.div>

      {/* Supported Languages - Styled Code Bubbles */}
      <motion.div
        className="flex gap-3 mb-12 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {languages.map((lang, index) => (
          <motion.div
            key={lang.code}
            className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            whileHover={{ scale: 1.1, rotate: 3, borderColor: 'var(--game-accent)' }}
          >
            <span className="font-black text-sm text-(--game-fg) group-hover:text-(--game-accent) transition-colors">{lang.code}</span>
          </motion.div>
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
            className="w-full py-4 bg-(--game-accent) text-white rounded-2xl font-bold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-lg hover:bg-[#4A7BC4] transition-all active:scale-[0.98]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Gamepad2 className="w-5 h-5 fill-white/20" />
            {session ? '開始遊戲' : '登入 / 開始遊戲'}
          </motion.button>
        </Link>

        {/* Admin Button */}
        <motion.button
          onClick={() => setShowAdminModal(true)}
          className="w-full py-3 bg-white text-(--game-muted-fg) font-bold rounded-2xl border border-[#e2e8f0] shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-[0.98]"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Settings className="w-4 h-4" />
          管理後台
        </motion.button>
      </motion.div>

      {/* Footer text */}
      <motion.p
        className="mt-8 text-xs font-bold text-(--game-muted-fg) z-10 tracking-widest uppercase opacity-60"
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAdminModal(false)}
          >
            <motion.div
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl ring-1 ring-black/5"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-(--game-fg) flex items-center gap-2">
                  <Lock className="w-5 h-5 text-(--game-accent)" />
                  管理員登入
                </h2>
                <button
                  onClick={() => setShowAdminModal(false)}
                  className="p-2 bg-(--game-muted) rounded-full text-(--game-muted-fg) hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminAccess()}
                  placeholder="輸入管理員密碼"
                  className={`w-full px-4 py-3 rounded-xl bg-(--game-muted) border-2 text-(--game-fg) font-bold focus:outline-none transition-colors ${passwordError
                      ? 'border-(--game-error) bg-red-50 focus:border-(--game-error)'
                      : 'border-transparent focus:border-(--game-accent) focus:bg-white'
                    }`}
                  autoFocus
                />

                {passwordError && (
                  <motion.p
                    className="text-(--game-error) text-sm font-bold flex items-center gap-1"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span>⚠️</span> 密碼錯誤，請重試
                  </motion.p>
                )}

                <motion.button
                  onClick={handleAdminAccess}
                  className="w-full py-3 bg-(--game-accent) text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-[#4A7BC4] transition-all"
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
