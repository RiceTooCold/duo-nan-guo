'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Trophy, ChevronLeft, Crown, Bot, User, Zap, Target, Timer, Medal } from 'lucide-react'
import { Avatar } from '@/components/game/Avatar'
import { getLeaderboard, type LeaderboardEntry } from '@/actions/leaderboard.server'
import { gameLanguages } from '@/lib/config/game'
import type { TargetLanguage } from '@/generated/prisma'

type FilterOption = 'all' | TargetLanguage

export default function LeaderboardPage() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<FilterOption>('all')

    useEffect(() => {
        async function loadLeaderboard() {
            setLoading(true)
            try {
                const data = await getLeaderboard(
                    filter === 'all' ? undefined : { lang: filter }
                )
                setEntries(data)
            } catch (error) {
                console.error('Failed to load leaderboard:', error)
            } finally {
                setLoading(false)
            }
        }
        loadLeaderboard()
    }, [filter])

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />
        if (rank === 2) return <Crown className="w-5 h-5 text-slate-400 fill-slate-400" />
        if (rank === 3) return <Crown className="w-5 h-5 text-amber-600 fill-amber-600" />
        return <span className="text-sm font-bold text-(--game-muted-fg)">{rank}</span>
    }

    return (
        <div className="min-h-dvh flex flex-col bg-(--game-muted) font-sans">
            {/* Sticky Header - Matches HistoryPage */}
            <header className="px-4 py-4 border-b-2 border-[#D5E3F7] flex flex-col gap-4 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Link
                        href="/lobby"
                        className="p-2 -ml-2 rounded-full hover:bg-(--game-secondary) transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-[#333]" />
                    </Link>
                    <h1 className="text-lg font-bold text-[#333]">排行榜</h1>
                </div>

            </header>

            {/* Content */}
            <main className="flex-1 px-4 py-6 overflow-y-auto">

                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-[#64748b]">
                        <Trophy className="w-5 h-5" />
                        <span className="text-sm font-medium">最強王者 Top 5</span>
                    </div>
                </div>

                {/* Filter Tabs Inside Header */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 mb-4">
                    <FilterButton
                        active={filter === 'all'}
                        onClick={() => setFilter('all')}
                        label="全部"
                    />
                    {gameLanguages.map(lang => (
                        <FilterButton
                            key={lang.id}
                            active={filter === lang.id}
                            onClick={() => setFilter(lang.id)}
                            label={`${lang.examName}`}
                        />
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-4 border-(--game-accent)/20 border-t-(--game-accent) rounded-full animate-spin" />
                    </div>
                ) : entries.length === 0 ? (
                    <motion.div
                        className="bg-white rounded-2xl border-2 border-[#D5E3F7] p-8 text-center"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Trophy className="w-12 h-12 text-(--game-muted-fg) mx-auto mb-3 opacity-50" />
                        <p className="text-(--game-muted-fg) font-medium">尚無排行資料</p>
                        <p className="text-sm text-(--game-muted-fg)/70 mt-1">開始對戰以進入排行榜！</p>
                    </motion.div>
                ) : (
                    <div className="space-y-3 pb-24">
                        {entries.map((entry, index) => (
                            <motion.div
                                key={entry.userId}
                                className="bg-white rounded-2xl border-2 border-[#D5E3F7] p-4 flex items-center gap-4 shadow-sm hover:border-(--game-accent) transition-colors"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                {/* Rank */}
                                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                                    {getRankIcon(entry.rank)}
                                </div>

                                {/* Avatar */}
                                <div className="relative shrink-0">
                                    <Avatar
                                        src={entry.avatar || ''}
                                        alt={entry.name}
                                        fallback={entry.name.substring(0, 1).toUpperCase()}
                                        size="sm"
                                    />
                                    {entry.isBot && (
                                        <div className="absolute -bottom-1 -right-1 bg-[#4c75b5] text-white rounded-full p-0.5">
                                            <Bot className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>

                                {/* Name & Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-[#333] truncate">
                                            {entry.name}
                                        </h3>
                                        {entry.isBot && entry.botModel && (
                                            <span className="text-[10px] font-medium bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full shrink-0">
                                                AI
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-[#64748b] mt-1">
                                        <span className="flex items-center gap-1">
                                            <Target className="w-3 h-3" />
                                            {entry.accuracy}%
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {entry.totalMatches}場
                                        </span>
                                    </div>
                                </div>

                                {/* Rating Score */}
                                <div className="text-right shrink-0">
                                    <div className="flex items-center gap-1 text-(--game-accent)">
                                        <Zap className="w-4 h-4 fill-current" />
                                        <span className="text-lg font-black">{entry.rating}</span>
                                    </div>
                                    <p className="text-[10px] text-(--game-muted-fg) font-medium">Rating</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Rating Formula Info - Floating Card */}
                {entries.length > 0 && (
                    <div className="fixed bottom-4 left-4 right-4 z-20">
                        <motion.div
                            className="bg-white/80 backdrop-blur-md rounded-xl border border-white/60 p-3 shadow-lg max-w-sm mx-auto"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <h4 className="text-xs font-bold text-[#333] mb-1.5 text-center">Rating 計算權重</h4>
                            <div className="flex justify-center gap-3 text-[10px] text-[#64748b] font-medium">
                                <span>勝率 40%</span>
                                <span>•</span>
                                <span>正確率 30%</span>
                                <span>•</span>
                                <span>速度 20%</span>
                                <span>•</span>
                                <span>活躍 10%</span>
                            </div>
                        </motion.div>
                    </div>
                )}
            </main>
        </div>
    )
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <motion.button
            onClick={onClick}
            className={`px-4 py-1.5 rounded-full font-bold text-sm whitespace-nowrap transition-all ${active
                ? 'bg-blue-100 text-[#5B8BD4] border-2 border-blue-200'
                : 'bg-white text-[#64748b] border-2 border-transparent hover:bg-slate-50'
                }`}
            whileTap={{ scale: 0.95 }}
        >
            {label}
        </motion.button>
    )
}
