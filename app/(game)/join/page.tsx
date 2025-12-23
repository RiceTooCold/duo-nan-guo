'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Users, RefreshCw, Clock } from 'lucide-react'
import { getWaitingMatches, joinWaitingMatch, type WaitingMatchInfo } from '@/actions/game.server'
import { rankToLevel } from '@/lib/config/game'
import type { TargetLanguage } from '@/generated/prisma'

const languageFlags: Record<TargetLanguage, string> = {
    JP: '🇯🇵',
    EN: '🇺🇸',
    KR: '🇰🇷',
    CN: '🇨🇳',
}

const languageNames: Record<TargetLanguage, string> = {
    JP: '日文',
    EN: '英文',
    KR: '韓文',
    CN: '中文',
}

export default function JoinPage() {
    const router = useRouter()
    const { data: session } = useSession()

    const [matches, setMatches] = useState<WaitingMatchInfo[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [joiningId, setJoiningId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Load matches on mount and refresh every 5s
    useEffect(() => {
        loadMatches()
        const interval = setInterval(loadMatches, 5000)
        return () => clearInterval(interval)
    }, [])

    async function loadMatches() {
        try {
            const data = await getWaitingMatches()
            setMatches(data)
            setError(null)
        } catch (err) {
            console.error('Failed to load matches:', err)
            setError('無法載入房間列表')
        } finally {
            setIsLoading(false)
        }
    }

    async function handleJoin(matchId: string) {
        if (!session?.user?.id) return

        setJoiningId(matchId)
        setError(null)

        try {
            const result = await joinWaitingMatch(matchId, session.user.id)
            if (result.success) {
                router.push(`/room/${matchId}`)
            } else {
                setError(result.error || '加入失敗')
                setJoiningId(null)
                loadMatches() // Refresh list
            }
        } catch (err) {
            console.error('Failed to join match:', err)
            setError('加入失敗，請重試')
            setJoiningId(null)
            loadMatches()
        }
    }

    function formatTimeAgo(date: Date) {
        const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
        if (seconds < 60) return `${seconds}秒前`
        const minutes = Math.floor(seconds / 60)
        return `${minutes}分鐘前`
    }

    return (
        <div className="min-h-dvh flex flex-col bg-[#F5F8FC]">
            {/* Header */}
            <header className="px-4 py-4 border-b-2 border-[#D5E3F7] flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                    <Link
                        href="/lobby"
                        className="p-2 -ml-2 rounded-full hover:bg-[#D5E3F7] transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-[#333]" />
                    </Link>
                    <h1 className="text-lg font-bold text-[#333]">加入房間</h1>
                </div>
                <button
                    onClick={loadMatches}
                    className="p-2 rounded-full hover:bg-[#D5E3F7] transition-colors"
                >
                    <RefreshCw className={`w-5 h-5 text-[#64748b] ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </header>

            <div className="flex-1 px-4 py-6">
                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 p-3 bg-red-100 text-red-700 rounded-xl text-sm"
                    >
                        {error}
                    </motion.div>
                )}

                {/* Loading State */}
                {isLoading && matches.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <RefreshCw className="w-8 h-8 text-[#5B8BD4] animate-spin mb-4" />
                        <p className="text-[#64748b]">載入中...</p>
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && matches.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Users className="w-16 h-16 text-[#D5E3F7] mb-4" />
                        <h2 className="text-lg font-bold text-[#333] mb-2">目前沒有開放的房間</h2>
                        <p className="text-[#64748b] text-center mb-6">
                            沒有玩家在等待對手，試試創建一個新房間吧！
                        </p>
                    </div>
                )}

                {/* Room List */}
                {matches.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-sm text-[#64748b] mb-4">
                            找到 {matches.length} 個等待中的房間
                        </p>
                        {matches.map((match) => (
                            <motion.div
                                key={match.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl border-2 border-[#D5E3F7] p-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">
                                            {languageFlags[match.targetLanguage]}
                                        </span>
                                        <div>
                                            <p className="font-bold text-[#333]">
                                                {languageNames[match.targetLanguage]} {rankToLevel(match.targetLanguage, match.rank)}
                                            </p>
                                            <p className="text-sm text-[#64748b]">
                                                {match.questionCount}題 · 房主: {match.hostName}
                                            </p>
                                        </div>
                                    </div>
                                    <motion.button
                                        onClick={() => handleJoin(match.id)}
                                        disabled={joiningId === match.id}
                                        className={`px-4 py-2 rounded-xl font-semibold transition-all ${joiningId === match.id
                                            ? 'bg-[#D5E3F7] text-[#64748b]'
                                            : 'bg-[#5B8BD4] text-white hover:bg-[#4A7BC4]'
                                            }`}
                                        whileHover={joiningId !== match.id ? { scale: 1.05 } : {}}
                                        whileTap={joiningId !== match.id ? { scale: 0.95 } : {}}
                                    >
                                        {joiningId === match.id ? '加入中...' : '加入'}
                                    </motion.button>
                                </div>
                                <div className="mt-2 flex items-center gap-1 text-xs text-[#94a3b8]">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatTimeAgo(match.createdAt)}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Fixed Bottom - Create Room CTA */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] p-4 bg-gradient-to-t from-[#F5F8FC] via-[#F5F8FC]/95 to-transparent">
                <Link href="/play">
                    <motion.button
                        className="w-full py-4 text-lg font-semibold rounded-2xl bg-white border-2 border-[#D5E3F7] text-[#5B8BD4] hover:bg-[#D5E3F7] transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        創建新房間
                    </motion.button>
                </Link>
            </div>
        </div>
    )
}
