'use client'

import { useEffect, useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useParams } from 'next/navigation'
import { Trophy, Zap, RotateCcw, Home, Flame, Clock, Target, Users } from 'lucide-react'
import confetti from 'canvas-confetti'
import { Avatar } from '@/components/game/Avatar'
import { getMatchResult } from '@/actions/game.server'
import type { GameResult } from '@/types/game'
import Image from 'next/image'

function LoadingFallback() {
    return (
        <div className="min-h-dvh flex flex-col items-center justify-center bg-[#F5F8FC]">
            <div className="w-12 h-12 border-[3px] border-slate-200 border-t-[#5B8BD4] rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 text-sm tracking-wide font-medium">計算成績中...</p>
        </div>
    )
}

function StatRow({
    icon: Icon,
    label,
    selfValue,
    oppValue,
    unit = '',
    highlightHigher = true
}: {
    icon: React.ElementType,
    label: string,
    selfValue: number | string,
    oppValue: number | string,
    unit?: string,
    highlightHigher?: boolean
}) {
    // Parse numbers for comparison
    const sVal = typeof selfValue === 'number' ? selfValue : parseFloat(String(selfValue))
    const oVal = typeof oppValue === 'number' ? oppValue : parseFloat(String(oppValue))

    let selfIsWinner = false
    let oppIsWinner = false

    if (!isNaN(sVal) && !isNaN(oVal)) {
        if (sVal === oVal) {
            // Tie - both regular color
        } else if (highlightHigher) {
            selfIsWinner = sVal > oVal
            oppIsWinner = oVal > sVal
        } else {
            // Lower is better (e.g. time)
            selfIsWinner = sVal < oVal
            oppIsWinner = oVal < sVal
        }
    }

    return (
        <div className="flex items-center justify-between py-4 border-b border-[#f1f5f9] last:border-0 group hover:bg-[#f8fafc] transition-colors px-4 -mx-4">
            <div className={`w-1/3 text-center font-bold text-lg ${selfIsWinner ? 'text-(--game-accent)' : 'text-(--game-muted-fg)'}`}>
                {selfValue}<span className="text-xs ml-0.5 opacity-60 font-medium">{unit}</span>
            </div>

            <div className="flex flex-col items-center justify-center w-1/3">
                <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                    <Icon className="w-4 h-4 text-(--game-accent)" />
                </div>
                <span className="text-[10px] text-(--game-muted-fg) font-bold tracking-wider">{label}</span>
            </div>

            <div className={`w-1/3 text-center font-bold text-lg ${oppIsWinner ? 'text-(--game-accent)' : 'text-(--game-muted-fg)'}`}>
                {oppValue}<span className="text-xs ml-0.5 opacity-60 font-medium">{unit}</span>
            </div>
        </div>
    )
}

function ResultsContent() {
    const router = useRouter()
    const params = useParams<{ matchId: string }>()
    const matchId = params.matchId

    const [result, setResult] = useState<GameResult | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Fetch result from server
    useEffect(() => {
        if (!matchId) return

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

        // Confetti for win - using Blue/White theme
        if (result.outcome === 'win') {
            const duration = 2000
            const ends = Date.now() + duration

            const frame = () => {
                confetti({
                    particleCount: 3,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0, y: 0.6 },
                    colors: ['#5B8BD4', '#93C5FD', '#E2E8F0']
                })
                confetti({
                    particleCount: 3,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1, y: 0.6 },
                    colors: ['#5B8BD4', '#93C5FD', '#E2E8F0']
                })

                if (Date.now() < ends) {
                    requestAnimationFrame(frame)
                }
            }
            frame()
        }
    }, [result])

    if (isLoading) return <LoadingFallback />

    if (!result) {
        return (
            <div className="min-h-dvh flex flex-col items-center justify-center bg-[#F5F8FC] p-6 text-center">
                <p className="text-slate-400 font-medium mb-6">無法載入對戰結果</p>
                <button
                    onClick={() => router.push('/play')}
                    className="text-[#5B8BD4] font-semibold hover:underline"
                >
                    返回大廳
                </button>
            </div>
        )
    }

    const { self, opponent, match } = result

    // Header Text Logic
    let headerTitle = '對戰結束'
    let headerSubtitle = '精彩的對決'
    let headerIconURL = ''

    if (result.outcome === 'win') {
        headerTitle = '勝利'
        headerSubtitle = '精彩的表現'
        headerIconURL = '/mascot-parrot-victory.png'
    } else if (result.outcome === 'lose') {
        headerTitle = '敗北'
        headerSubtitle = '再接再厲'
        headerIconURL = '/mascot-parrot-crying.png'
    } else {
        headerTitle = '平局'
        headerSubtitle = '勢均力敵'
        headerIconURL = '/mascot-parrot.png'
    }

    return (
        <div className="min-h-dvh bg-(--game-muted) flex flex-col items-center py-8 px-4 font-sans relative overflow-hidden">

            {/* Background Decoration (Lobby Style) */}
            <div className="absolute top-0 left-0 w-full h-[400px] bg-linear-to-b from-(--game-secondary)/30 to-transparent -z-10" />
            <motion.div
                className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-(--game-primary)/10 rounded-full blur-3xl -z-10"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 5, repeat: Infinity }}
            />
            <motion.div
                className="absolute top-[20%] left-[-20px] w-40 h-40 bg-(--game-accent)/5 rounded-full blur-2xl -z-10"
                animate={{ scale: [1, 1.1, 1], x: [0, 10, 0] }}
                transition={{ duration: 7, repeat: Infinity }}
            />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-4 mt-4 relative flex items-center"
            >
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold text-(--game-fg) tracking-tight drop-shadow-sm">{headerTitle}</h1>
                    <p className="text-(--game-muted-fg) text-sm font-bold mt-2 tracking-widest uppercase opacity-80">{headerSubtitle}</p>
                </div>
                <Image
                    src={headerIconURL}
                    alt="Mascot"
                    width={100}
                    height={100}
                    className="mb-1"
                />
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold text-(--game-fg) tracking-tight drop-shadow-sm">{headerTitle}</h1>
                    <p className="text-(--game-muted-fg) text-sm font-bold mt-2 tracking-widest uppercase opacity-80">{headerSubtitle}</p>
                </div>
            </motion.div>

            {/* Main Result Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="w-full max-w-sm bg-white rounded-4xl shadow-xl shadow-blue-900/5 border border-[#e2e8f0] overflow-hidden relative"
            >
                {/* Players Section - Blue Background */}
                <div className="p-8 pb-10 flex items-center justify-between relative z-10 bg-(--game-accent) text-white">
                    {/* Decorative pattern/gradient */}
                    <div className="absolute inset-0 bg-linear-to-b from-white/10 to-transparent pointer-events-none" />

                    {/* Self */}
                    <div className="flex flex-col items-center w-28 relative z-10">
                        <div className="relative">
                            <Avatar
                                src={self.avatar || '/mascot-parrot.jpg'}
                                alt={self.name}
                                fallback={self.name.charAt(0)}
                                size="lg"
                            />
                            {result.outcome === 'win' && (
                                <motion.div
                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    className="absolute -bottom-2 -right-2 bg-(--game-warning) text-white p-1.5 rounded-full shadow-md border-2 border-white"
                                >
                                    <Trophy className="w-3.5 h-3.5 fill-current" />
                                </motion.div>
                            )}
                        </div>
                        <p className="font-bold text-blue-50 mt-3 text-sm truncate max-w-full text-center px-1">
                            {self.name}
                        </p>
                        <div className="mt-1 text-4xl font-black text-white tracking-tighter drop-shadow-sm">
                            {self.score}
                        </div>
                    </div>

                    {/* VS */}
                    <div className="flex flex-col items-center justify-center -mt-8 relative z-10">
                        <span className="text-blue-200/50 font-black text-3xl italic">VS</span>
                    </div>

                    {/* Opponent */}
                    <div className="flex flex-col items-center w-28 relative z-10">
                        <div className="relative">
                            <Avatar
                                src={opponent.avatar || '/mascot-robot.jpg'}
                                alt={opponent.name}
                                fallback={opponent.isBot ? '機器人' : opponent.name.charAt(0)}
                                size="lg"
                            />
                        </div>
                        <p className="font-bold text-blue-50 mt-3 text-sm truncate max-w-full text-center px-1">
                            {opponent.name}
                        </p>
                        <div className={`mt-1 text-4xl font-black tracking-tighter ${result.outcome === 'lose' ? 'text-white' : 'text-blue-200/70'}`}>
                            {opponent.score}
                        </div>
                    </div>
                </div>

                {/* Match Info Badge - Floating between sections */}
                <div className="flex justify-center -mt-3 relative z-20">
                    <div className="bg-white border border-[#e2e8f0] shadow-sm rounded-full px-4 py-1.5 text-[10px] font-bold text-(--game-muted-fg) tracking-wider uppercase">
                        {match.language} • {match.level} • {match.totalQuestions}題
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="px-6 pb-6 pt-4">
                    <StatRow
                        icon={Target}
                        label="答對題數"
                        selfValue={self.correctAnswers}
                        oppValue={opponent.correctAnswers}
                        unit={`/${match.totalQuestions}`}
                    />
                    <StatRow
                        icon={Clock}
                        label="平均速度"
                        selfValue={self.avgResponseTime}
                        oppValue={opponent.avgResponseTime}
                        unit="s"
                        highlightHigher={false} // Lower time is better
                    />
                    <StatRow
                        icon={Flame}
                        label="最高連對"
                        selfValue={self.maxStreak}
                        oppValue={opponent.maxStreak}
                    />
                </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full max-w-sm mt-8 flex flex-col gap-3"
            >
                <button
                    onClick={() => router.push('/play')}
                    className="w-full py-4 bg-[#5B8BD4] hover:bg-[#4A7BC4] text-white rounded-2xl font-bold shadow-lg shadow-[#5B8BD4]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    <RotateCcw className="w-5 h-5 stroke-[2.5]" />
                    <span>再來一局</span>
                </button>

                <button
                    onClick={() => router.push('/lobby')}
                    className="w-full py-4 bg-white hover:bg-slate-50 text-slate-500 font-bold rounded-2xl border border-slate-200 shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    <Home className="w-5 h-5 stroke-[2.5]" />
                    <span>回大廳</span>
                </button>
            </motion.div>

        </div >
    )
}

export default function ResultsPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <ResultsContent />
        </Suspense>
    )
}
