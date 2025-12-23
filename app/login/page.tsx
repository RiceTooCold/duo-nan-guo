'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function LoginPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState<'google' | 'github' | null>(null)

    // Redirect if already logged in
    useEffect(() => {
        if (session) {
            if (session.user?.role === 'admin') {
                router.push('/admin')
            } else {
                router.push('/lobby')
            }
        }
    }, [session, router])

    const handleOAuthSignIn = async (provider: 'google' | 'github') => {
        setIsLoading(provider)
        await signIn(provider, { callbackUrl: '/lobby' })
    }

    // Language characters for background decoration
    const langChars = ['あ', 'B', '한', '中', 'の', 'K', '가', '文', 'い', 'E', '나', '語']

    if (status === 'loading') {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-white">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-8 h-8 border-3 border-[#5B8BD4] border-t-transparent rounded-full"
                />
            </div>
        )
    }

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
                className="mt-16 mb-12 text-center z-10"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <h1 className="text-3xl font-bold text-[#333] mb-2">
                    歡迎來到多難過！
                </h1>
                <p className="text-[#64748b]">
                    登入以開始你的語言挑戰之旅
                </p>
            </motion.div>

            {/* OAuth Buttons */}
            <motion.div
                className="flex flex-col gap-4 z-10 max-w-sm mx-auto w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                {/* Google Sign In */}
                <motion.button
                    type="button"
                    onClick={() => handleOAuthSignIn('google')}
                    disabled={isLoading !== null}
                    className="game-btn game-btn-secondary flex items-center justify-center gap-3 py-4 text-lg"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    {isLoading === 'google' ? (
                        <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            className="inline-block w-5 h-5 border-2 border-[#333] border-t-transparent rounded-full"
                        />
                    ) : (
                        <>
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            使用 Google 登入
                        </>
                    )}
                </motion.button>
            </motion.div>

            {/* Footer */}
            <motion.p
                className="text-center text-sm text-[#64748b] mt-auto pt-8 z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                登入即表示你同意我們的服務條款
            </motion.p>
        </div>
    )
}
