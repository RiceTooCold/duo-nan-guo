'use client'

import { useEffect, useState, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useParams } from 'next/navigation'
import { Trophy, Zap, RotateCcw, Home, Flame } from 'lucide-react'
import confetti from 'canvas-confetti'
import { Avatar } from '@/components/game/Avatar'
import { getMatchResult } from '@/actions/game.server'
import type { GameResult } from '@/types/game'

function LoadingFallback() {
    return (
        <div className="min-h-dvh flex flex-col items-center justify-center bg-[#F5F8FC] p-4">
            <div className="w-16 h-16 border-4 border-[#5B8BD4] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[#64748b]">載入對戰結果...</p>
        </div>
    )
}

function ResultsContent() {
    const router = useRouter()
    const params = useParams<{ matchId: string }>()
    const matchId = params.matchId

    const [result, setResult] = useState<GameResult | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showStats, setShowStats] = useState(false)

    // Fetch result from server
    useEffect(() => {
        if (!matchId) {
            setIsLoading(false)
            return
        }

        const fetchResult = async () => {
            try {
                const data = await getMatchResult(matchId)
                setResult(data)
            } catch (error) {
                console.error('Failed to fetch result:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchResult()
    }, [matchId])

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
        router.push('/play')
    }

    // Navigate to lobby
    const handleGoHome = () => {
        router.push('/lobby')
    }

    // Loading state
    if (isLoading) {
        return <LoadingFallback />
    }

    // No result state
    if (!result) {
        return (
            <div className="min-h-dvh flex flex-col items-center justify-center bg-[#F5F8FC] p-4">
                <p className="text-[#64748b] mb-4">找不到對戰結果</p>
                <button
                    onClick={() => router.push('/play')}
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
            title: '🏆 勝利！',
            subtitle: '恭喜你贏得比賽！',
            bgGradient: 'from-[#E0F2E9] to-[#D5E3F7]',
            textColor: 'text-[#22c55e]'
        },
        lose: {
            title: '😢 可惜...',
            subtitle: '再接再厲！',
            bgGradient: 'from-[#FEE2E2] to-[#FDE2E4]',
            textColor: 'text-[#ef4444]'
        },
        tie: {
            title: '🤝 平手！',
            subtitle: '勢均力敵的對決！',
            bgGradient: 'from-[#FEF3C7] to-[#FDE68A]',
            textColor: 'text-[#f59e0b]'
        }
    }

    const config = outcomeConfig[result.outcome]
    const { self, opponent, match } = result

    return (
        <div className={`min-h-dvh flex flex-col bg-gradient-to-b ${config.bgGradient}`}>
            {/* Outcome Banner */}
            <motion.section
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-12 pb-8 text-center"
            >
                <motion.h1
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                    className={`text-4xl font-bold ${config.textColor}`}
                >
                    {config.title}
                </motion.h1>
                <p className="text-[#64748b] mt-2">{config.subtitle}</p>
            </motion.section>

            {/* Score Comparison */}
            <section className="px-4 pb-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-3xl shadow-lg p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        {/* Self */}
                        <div className="flex flex-col items-center w-1/3">
                            <Avatar
                                src={self.avatar || '/mascot-parrot.jpg'}
                                alt={self.name}
                                fallback={self.name.charAt(0)}
                                size="lg"
                            />
                            <p className="font-semibold text-[#333] mt-2 text-sm truncate max-w-full">{self.name}</p>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-2xl font-bold text-[#5B8BD4]"
                            >
                                {self.score}
                            </motion.p>
                        </div>

                        {/* VS */}
                        <div className="flex flex-col items-center">
                            <span className="text-[#94a3b8] font-bold text-xl">VS</span>
                        </div>

                        {/* Opponent */}
                        <div className="flex flex-col items-center w-1/3">
                            <Avatar
                                src={opponent.avatar || '/mascot-robot.jpg'}
                                alt={opponent.name}
                                fallback={opponent.isBot ? '🤖' : opponent.name.charAt(0)}
                                size="lg"
                                badge={opponent.isBot ? 'ai' : undefined}
                            />
                            <p className="font-semibold text-[#333] mt-2 text-sm truncate max-w-full">{opponent.name}</p>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-2xl font-bold text-[#ef4444]"
                            >
                                {opponent.score}
                            </motion.p>
                        </div>
                    </div>

                    {/* Match Info */}
                    <div className="text-center text-[#94a3b8] text-sm">
                        {match.language} · {match.level} · {match.totalQuestions}題
                    </div>
                </motion.div>
            </section>

            {/* Statistics */}
            <AnimatePresence>
                {showStats && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="px-4 pb-6 flex-1"
                    >
                        <div className="grid grid-cols-3 gap-3">
                            {/* Response Speed */}
                            <div className="bg-white rounded-2xl p-4 shadow-sm">
                                <div className="flex items-center justify-center w-10 h-10 bg-[#D5E3F7] rounded-full mx-auto mb-2">
                                    <Zap className="w-5 h-5 text-[#5B8BD4]" />
                                </div>
                                <p className="text-center text-xs text-[#94a3b8]">平均速度</p>
                                <p className="text-center text-lg font-bold text-[#333]">{self.avgResponseTime}s</p>
                            </div>

                            {/* Correct Answers */}
                            <div className="bg-white rounded-2xl p-4 shadow-sm">
                                <div className="flex items-center justify-center w-10 h-10 bg-[#E0F2E9] rounded-full mx-auto mb-2">
                                    <Trophy className="w-5 h-5 text-[#22c55e]" />
                                </div>
                                <p className="text-center text-xs text-[#94a3b8]">答對題數</p>
                                <p className="text-center text-lg font-bold text-[#333]">{self.correctAnswers}/{match.totalQuestions}</p>
                            </div>

                            {/* Streak */}
                            <div className="bg-white rounded-2xl p-4 shadow-sm">
                                <div className="flex items-center justify-center w-10 h-10 bg-[#FEE2E2] rounded-full mx-auto mb-2">
                                    <Flame className="w-5 h-5 text-[#ef4444]" />
                                </div>
                                <p className="text-center text-xs text-[#94a3b8]">最高連續</p>
                                <p className="text-center text-lg font-bold text-[#333]">{self.maxStreak}</p>
                            </div>
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>

            {/* Action Buttons */}
            <section className="p-4 mt-auto">
                <div className="flex gap-3">
                    <button
                        onClick={handleGoHome}
                        className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-white text-[#64748b] font-semibold shadow-sm hover:bg-gray-50 transition-colors"
                    >
                        <Home className="w-5 h-5" />
                        首頁
                    </button>
                    <button
                        onClick={handlePlayAgain}
                        className="flex-[2] flex items-center justify-center gap-2 py-4 rounded-xl bg-[#5B8BD4] text-white font-semibold shadow-lg hover:bg-[#4A7AC3] transition-colors"
                    >
                        <RotateCcw className="w-5 h-5" />
                        再玩一次
                    </button>
                </div>
            </section>
        </div>
    )
}

export default function ResultsPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <ResultsContent />
        </Suspense>
    )
}
