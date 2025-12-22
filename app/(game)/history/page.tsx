'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Calendar, ChevronRight, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { getUserMatchHistory, type MatchHistoryItem } from '@/actions/game.server'

const languageInfo: Record<string, { flag: string; name: string }> = {
    JP: { flag: '🇯🇵', name: '日文' },
    EN: { flag: '🇺🇸', name: '英文' },
    KR: { flag: '🇰🇷', name: '韓文' },
    CN: { flag: '🇨🇳', name: '中文' },
}

export default function HistoryPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const [matches, setMatches] = useState<MatchHistoryItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchHistory() {
            if (!session?.user?.id) return

            try {
                const history = await getUserMatchHistory(session.user.id)
                setMatches(history)
            } catch (err) {
                console.error('Failed to fetch history:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchHistory()
    }, [session?.user?.id])

    return (
        <div className="min-h-dvh flex flex-col bg-[#F5F8FC]">
            {/* Header */}
            <header className="px-4 py-4 border-b-2 border-[#D5E3F7] flex items-center gap-4 bg-white sticky top-0 z-10">
                <Link
                    href="/lobby"
                    className="p-2 -ml-2 rounded-full hover:bg-[#D5E3F7] transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-[#333]" />
                </Link>
                <h1 className="text-lg font-bold text-[#333]">歷史戰績</h1>
            </header>

            {/* Content */}
            <div className="flex-1 px-4 py-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-[#64748b]">
                        <Trophy className="w-5 h-5" />
                        <span className="text-sm font-medium">近期對戰</span>
                    </div>
                    <span className="text-sm text-[#64748b]">
                        共 {matches.length} 場
                    </span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-3 border-[#5B8BD4] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : matches.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-[#64748b]">尚無對戰紀錄</p>
                        <Link href="/room" className="text-[#5B8BD4] font-medium mt-2 inline-block">
                            開始你的第一場對戰 →
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {matches.map((match, index) => (
                            <motion.div
                                key={match.id}
                                className="bg-white rounded-2xl border-2 border-[#D5E3F7] p-4 flex items-center gap-4 shadow-sm cursor-pointer hover:border-[#5B8BD4] transition-colors"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => router.push(`/history/${match.id}`)}
                                whileTap={{ scale: 0.98 }}
                            >
                                {/* Language Flag */}
                                <div className="w-12 h-12 rounded-xl bg-[#F0F7FF] flex items-center justify-center text-2xl border border-[#D5E3F7]">
                                    {languageInfo[match.language]?.flag || '🌐'}
                                </div>

                                {/* Match Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-[#333]">
                                            {languageInfo[match.language]?.name || match.language}
                                        </span>
                                        <span className="text-xs px-2 py-0.5 bg-[#E2E8F0] rounded-full text-[#475569] font-medium">
                                            Lv. {match.rank}
                                        </span>
                                        {match.isTie ? (
                                            <span className="text-xs px-2 py-0.5 bg-[#f1f5f9] rounded-full text-[#64748b] font-medium flex items-center gap-1">
                                                <Minus className="w-3 h-3" /> 平
                                            </span>
                                        ) : match.isWin ? (
                                            <span className="text-xs px-2 py-0.5 bg-[#dcfce7] rounded-full text-[#22c55e] font-medium flex items-center gap-1">
                                                <TrendingUp className="w-3 h-3" /> 勝
                                            </span>
                                        ) : (
                                            <span className="text-xs px-2 py-0.5 bg-[#fee2e2] rounded-full text-[#ef4444] font-medium flex items-center gap-1">
                                                <TrendingDown className="w-3 h-3" /> 敗
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-[#64748b] flex items-center gap-2">
                                        <Calendar className="w-3 h-3" /> {match.date} · vs {match.opponentName}
                                    </p>
                                </div>

                                {/* Score & Arrow */}
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-[#5B8BD4]">{match.playerScore}</p>
                                        <p className="text-xs text-[#64748b]">vs {match.opponentScore}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-[#CBD5E1]" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
