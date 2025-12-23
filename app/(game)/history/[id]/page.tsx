'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, CheckCircle, XCircle, Trophy, Target, Minus, Clock } from 'lucide-react'
import { getMatchDetail, type MatchDetail } from '@/actions/user.server'

const languageInfo: Record<string, { flag: string; name: string }> = {
    JP: { flag: '🇯🇵', name: '日文' },
    EN: { flag: '🇺🇸', name: '英文' },
    KR: { flag: '🇰🇷', name: '韓文' },
    CN: { flag: '🇨🇳', name: '中文' },
}

export default function HistoryDetailPage() {
    const params = useParams()
    const matchId = params.id as string
    const { data: session } = useSession()
    const [detail, setDetail] = useState<MatchDetail | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchDetail() {
            if (!session?.user?.id || !matchId) return

            try {
                const data = await getMatchDetail(matchId, session.user.id)
                setDetail(data)
            } catch (err) {
                console.error('Failed to fetch match detail:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchDetail()
    }, [matchId, session?.user?.id])

    if (loading) {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-[#F5F8FC]">
                <div className="w-8 h-8 border-3 border-[#5B8BD4] border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!detail) {
        return (
            <div className="min-h-dvh flex flex-col items-center justify-center bg-[#F5F8FC] p-4">
                <p className="text-[#64748b] mb-4">找不到此對戰紀錄</p>
                <Link href="/history" className="text-[#5B8BD4] font-medium">
                    ← 返回歷史戰績
                </Link>
            </div>
        )
    }

    const accuracy = detail.totalQuestions > 0
        ? Math.round((detail.correctAnswers / detail.totalQuestions) * 100)
        : 0

    return (
        <div className="min-h-dvh flex flex-col bg-[#F5F8FC]">
            {/* Header */}
            <header className="px-4 py-4 border-b-2 border-[#D5E3F7] flex items-center gap-4 bg-white sticky top-0 z-10">
                <Link
                    href="/history"
                    className="p-2 -ml-2 rounded-full hover:bg-[#D5E3F7] transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-[#333]" />
                </Link>
                <h1 className="text-lg font-bold text-[#333]">對戰詳情</h1>
            </header>

            <div className="flex-1 px-4 py-6 space-y-4 overflow-y-auto">
                {/* Summary Card */}
                <motion.div
                    className="bg-white rounded-2xl border-2 border-[#D5E3F7] p-5"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{languageInfo[detail.language]?.flag || '🌐'}</span>
                            <div>
                                <h2 className="font-bold text-[#333]">
                                    {languageInfo[detail.language]?.name || detail.language} Lv.{detail.rank}
                                </h2>
                                <p className="text-sm text-[#64748b]">{detail.date}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {detail.isTie ? (
                                <div className="flex items-center gap-1 text-[#64748b]">
                                    <Minus className="w-5 h-5" />
                                    <span className="font-bold">平手</span>
                                </div>
                            ) : detail.isWin ? (
                                <div className="flex items-center gap-1 text-[#22c55e]">
                                    <Trophy className="w-5 h-5" />
                                    <span className="font-bold">勝利</span>
                                </div>
                            ) : (
                                <span className="text-[#ef4444] font-bold">敗北</span>
                            )}
                        </div>
                    </div>

                    {/* Score Comparison */}
                    <div className="flex items-center justify-center gap-4 py-3 bg-[#F5F8FC] rounded-xl mb-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-[#5B8BD4]">{detail.playerScore}</p>
                            <p className="text-xs text-[#64748b]">{detail.playerName}</p>
                        </div>
                        <span className="text-xl font-bold text-[#64748b]">VS</span>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-[#333]/50">{detail.opponentScore}</p>
                            <p className="text-xs text-[#64748b]">{detail.opponentName}</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-[#dcfce7] rounded-xl p-3 text-center">
                            <p className="text-xl font-bold text-[#22c55e]">{detail.correctAnswers}</p>
                            <p className="text-xs text-[#22c55e]">答對</p>
                        </div>
                        <div className="bg-[#fee2e2] rounded-xl p-3 text-center">
                            <p className="text-xl font-bold text-[#ef4444]">{detail.totalQuestions - detail.correctAnswers}</p>
                            <p className="text-xs text-[#ef4444]">答錯</p>
                        </div>
                        <div className="bg-[#D5E3F7] rounded-xl p-3 text-center">
                            <p className="text-xl font-bold text-[#5B8BD4]">{accuracy}%</p>
                            <p className="text-xs text-[#5B8BD4]">準確率</p>
                        </div>
                    </div>
                </motion.div>

                {/* Questions List */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-[#64748b] px-1 flex items-center gap-2">
                        <Target className="w-4 h-4" /> 答題記錄
                    </h3>

                    {detail.questions.map((q, index) => {
                        // Timeout: either null (no record) or '' (explicit timeout)
                        const isTimeout = !q.playerAnswer || q.playerAnswer === '';

                        return (
                            <motion.div
                                key={q.id}
                                className={`bg-white rounded-2xl border-2 p-4 ${isTimeout ? 'border-amber-400/50' : q.isCorrect ? 'border-[#22c55e]/30' : 'border-[#ef4444]/30'}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                {/* Question Header */}
                                <div className="flex items-start gap-3 mb-3">
                                    <div className={`mt-0.5 ${isTimeout ? 'text-amber-500' : q.isCorrect ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                                        {isTimeout ? (
                                            <Clock className="w-5 h-5" />
                                        ) : q.isCorrect ? (
                                            <CheckCircle className="w-5 h-5" />
                                        ) : (
                                            <XCircle className="w-5 h-5" />
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-[#333] flex-1">
                                        <span className="text-[#5B8BD4] font-bold">Q{index + 1}.</span> {q.stimulus}
                                        {isTimeout && (
                                            <span className="ml-2 text-xs font-medium text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">超時</span>
                                        )}
                                    </p>
                                </div>

                                {/* Options Grid */}
                                <div className="grid grid-cols-2 gap-2 ml-8">
                                    {Object.entries(q.options).map(([key, value]) => {
                                        const isPlayerAnswer = q.playerAnswer === key
                                        const isCorrectAnswer = q.correctAnswer === key

                                        let optionClass = 'bg-[#F5F8FC] border-[#D5E3F7] text-[#333]'
                                        let indicator = null

                                        if (isCorrectAnswer && isPlayerAnswer) {
                                            // Correct answer that player selected
                                            optionClass = 'bg-[#dcfce7] border-[#22c55e] text-[#22c55e]'
                                            indicator = <CheckCircle className="w-4 h-4 text-[#22c55e]" />
                                        } else if (isCorrectAnswer) {
                                            // Correct answer that player didn't select
                                            optionClass = 'bg-[#dcfce7] border-[#22c55e] text-[#22c55e]'
                                            indicator = <span className="text-xs font-bold">正解</span>
                                        } else if (isPlayerAnswer) {
                                            // Wrong answer that player selected
                                            optionClass = 'bg-[#fee2e2] border-[#ef4444] text-[#ef4444]'
                                            indicator = <XCircle className="w-4 h-4 text-[#ef4444]" />
                                        }

                                        return (
                                            <div
                                                key={key}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm ${optionClass}`}
                                            >
                                                <span className="font-bold uppercase w-5">{key}.</span>
                                                <span className="flex-1">{value}</span>
                                                {indicator}
                                            </div>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
