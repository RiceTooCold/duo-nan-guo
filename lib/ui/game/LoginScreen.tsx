'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simulate login
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Redirect to profile after login
    window.location.href = '/profile'
  }

  // Language characters for background decoration
  const langChars = ['あ', 'B', '한', '中', 'の', 'K', '가', '文', 'い', 'E', '나', '語']

  return (
    <div className="min-h-dvh flex flex-col px-6 py-8 bg-white relative overflow-hidden">
      {/* Background Language Characters */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        {langChars.map((char, index) => (
          <motion.span
            key={index}
            className="absolute text-4xl font-bold text-[#333]/5"
            style={{
              left: `${(index % 4) * 25 + Math.random() * 10}%`,
              top: `${Math.floor(index / 4) * 30 + Math.random() * 20}%`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            {char}
          </motion.span>
        ))}
      </div>

      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-[#64748b] hover:text-[#333] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回</span>
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div
        className="mt-12 mb-10 text-center z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-3xl font-bold text-[#333] mb-2">
          歡迎回來！
        </h1>
        <p className="text-[#64748b]">
          登入以繼續你的學習旅程
        </p>
      </motion.div>

      {/* Login Form */}
      <motion.form
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col gap-5 z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Email Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#333]">
            電子郵件
          </label>
          <motion.input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="game-input"
            whileFocus={{ scale: 1.01 }}
            required
          />
        </div>

        {/* Password Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#333]">
            密碼
          </label>
          <div className="relative">
            <motion.input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="game-input pr-12"
              whileFocus={{ scale: 1.01 }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#333] transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Forgot Password */}
        <div className="text-right">
          <Link 
            href="#" 
            className="text-sm text-[#5B8BD4] hover:underline"
          >
            忘記密碼？
          </Link>
        </div>

        {/* Login Button */}
        <motion.button
          type="submit"
          disabled={isLoading}
          className="game-btn game-btn-primary w-full py-4 text-lg mt-4"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full"
            />
          ) : (
            '登入'
          )}
        </motion.button>

        {/* Divider */}
        <div className="flex items-center gap-4 my-4">
          <div className="flex-1 h-px bg-[#D5E3F7]" />
          <span className="text-sm text-[#64748b]">或</span>
          <div className="flex-1 h-px bg-[#D5E3F7]" />
        </div>

        {/* Social Login Buttons */}
        <div className="flex gap-3">
          <motion.button
            type="button"
            className="game-btn game-btn-secondary flex-1 py-3"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-xl">G</span>
          </motion.button>
          <motion.button
            type="button"
            className="game-btn game-btn-secondary flex-1 py-3"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-xl">🍎</span>
          </motion.button>
        </div>

        {/* Sign Up Link */}
        <p className="text-center text-[#64748b] mt-auto pt-6">
          還沒有帳號？{' '}
          <Link href="#" className="text-[#5B8BD4] font-semibold hover:underline">
            立即註冊
          </Link>
        </p>
      </motion.form>
    </div>
  )
}

