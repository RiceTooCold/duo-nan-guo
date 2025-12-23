'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Trophy, History, User, Sword, MessageCircle, Settings, LogOut, ChartNoAxesCombined, Flame, Crosshair, Zap, Gamepad } from 'lucide-react'
import { Avatar } from '@/components/game/Avatar'
import { signOut } from 'next-auth/react'
import type { UserDashboardStats } from '@/actions/user.server'
import type { Session } from 'next-auth'

interface LobbyDashboardProps {
    stats: UserDashboardStats
    session: Session | null
}

// Helper to determine rank title
const getRankTitle = (level: number) => {
    if (level < 5) return '語言學徒'
    if (level < 10) return '單字新星'
    if (level < 20) return '語法專家'
    return '語言大師'
}

export default function LobbyDashboard({ stats, session }: LobbyDashboardProps) {
    const rankTitle = getRankTitle(stats.level)

    // XP progress: each level is 100 XP
    const xpProgress = stats.exp % 100

    const handleSignOut = async () => {
        await signOut({ callbackUrl: '/' })
    }

    return (
        <div className="min-h-dvh flex flex-col bg-(--game-muted) relative overflow-hidden font-sans">
            {/* Decorative BG - Consistent with Results Page */}
            <div className="absolute top-0 left-0 w-full h-[400px] bg-linear-to-b from-(--game-secondary)/30 to-transparent -z-10" />
            <motion.div
                className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-(--game-primary)/10 rounded-full blur-3xl -z-10"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 5, repeat: Infinity }}
            />

            {/* Header / Player Command Center */}
            <header className="px-6 pt-8 pb-4">
                <div className="relative overflow-visible">
                    <div className="flex items-center gap-5 bg-white/60 backdrop-blur-md border border-white/60 p-4 rounded-3xl shadow-sm">
                        {/* Avatar */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="relative shrink-0"
                        >
                            <Avatar
                                src={session?.user?.image || ''}
                                alt={session?.user?.name || 'User'}
                                fallback={session?.user?.name?.substring(0, 1).toUpperCase() || 'U'}
                                size="md"
                            />
                        </motion.div>

                        {/* User Info & Stats */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                {/* Top Row: Name & Level */}
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-lg font-black text-(--game-fg) tracking-tight truncate">
                                        {session?.user?.name || 'Player'}
                                    </h2>
                                    <span className="bg-blue-50 text-(--game-accent) text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100 shrink-0">
                                        Lv.{stats.level}
                                    </span>
                                </div>

                                {/* Rank Title & XP */}
                                <div className="flex items-center justify-between text-xs font-bold text-(--game-muted-fg) mb-2">
                                    <span>{rankTitle}</span>
                                    <span className="text-[10px] text-(--game-muted-fg) tracking-wider font-medium opacity-80">EXP {Math.round(xpProgress)}%</span>
                                </div>

                                {/* XP Progress Bar */}
                                <div className="h-1.5 w-full bg-[#f1f5f9] rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-(--game-accent)"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${xpProgress}%` }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                    />
                                </div>
                            </motion.div>
                        </div>

                        {/* Settings / Logout */}
                        <div className="shrink-0 self-start">
                            <motion.button
                                onClick={handleSignOut}
                                className="p-2 text-(--game-muted-fg) hover:text-slate-600 hover:bg-[#f1f5f9] rounded-xl transition-colors"
                            >
                                <LogOut className="w-5 h-5" />
                            </motion.button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Overview - Clean Single Color */}
            <section className="px-6 mb-6">
                <div className="grid grid-cols-2 gap-3">
                    <StatBox
                        icon={Gamepad}
                        label="總場次"
                        value={stats.totalMatches}
                        delay={0.1}
                        highlight={stats.totalMatches > 10}
                    />
                    <StatBox
                        icon={Crosshair}
                        label="勝率"
                        value={`${stats.winRate}%`}
                        delay={0.2}
                        highlight={stats.winRate > 50}
                    />
                    <StatBox
                        icon={Flame}
                        label="連勝紀錄"
                        value={stats.currentStreak}
                        delay={0.3}
                        highlight={stats.currentStreak > 2}
                    />
                    <StatBox
                        icon={Zap}
                        label="答題速度"
                        value={`${stats.avgSpeed}s`}
                        delay={0.4}
                        highlight={stats.avgSpeed < 3}
                    />
                </div>
            </section>

            {/* Main Content Area */}
            <main className="flex-1 px-6 flex flex-col gap-6 pb-6">

                {/* Hero / Game Actions */}
                <motion.section
                    className="relative"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="relative overflow-visible bg-(--game-accent) rounded-4xl p-6 shadow-xl shadow-blue-500/20 min-h-[160px] flex flex-col justify-center group hover:shadow-blue-500/30 transition-shadow">

                        {/* Subtle Texture/Gradient Overlay */}
                        <div className="absolute inset-0 bg-linear-to-br from-white/10 to-transparent rounded-4xl pointer-events-none" />

                        {/* Mascot Image */}
                        <div className="absolute -right-4 -bottom-6 w-48 h-48 pointer-events-none group-hover:scale-105 transition-transform duration-500">
                            <Image
                                src="/mascot-parrot.png"
                                alt="Coach Parrot"
                                width={200}
                                height={200}
                                className="object-contain drop-shadow-2xl transform rotate-[-5deg]"
                            />
                        </div>

                        <div className="relative z-10 w-[65%] text-white">
                            <h3 className="text-2xl font-black mb-1 tracking-tight drop-shadow-md">準備好了嗎？</h3>
                            <p className="text-blue-50 text-sm mb-5 font-medium leading-relaxed opacity-90">
                                立即開始對戰，提升你的語言等級！
                            </p>

                            <div className="flex flex-col gap-2.5 items-start">
                                <Link href="/play" className="w-full sm:w-auto">
                                    <motion.button
                                        className="w-auto px-6 py-3 bg-white text-(--game-accent) font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all hover:bg-blue-50"
                                        whileTap={{ scale: 0.97 }}
                                    >
                                        <Sword className="w-4 h-4 fill-current" />
                                        <span>創建房間</span>
                                    </motion.button>
                                </Link>
                                <Link href="/join" className="w-full sm:w-auto">
                                    <motion.button
                                        className="w-auto px-6 py-3 bg-blue-600/30 text-white font-bold rounded-xl border border-white/20 shadow-sm flex items-center justify-center gap-2 text-sm transition-all hover:bg-blue-600/40"
                                        whileTap={{ scale: 0.97 }}
                                    >
                                        <User className="w-4 h-4" />
                                        <span>加入房間</span>
                                    </motion.button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* Secondary Actions */}
                <section className="grid grid-cols-2 gap-4">
                    <Link href="/history">
                        <ActionCard
                            icon={History}
                            title="歷史戰績"
                            desc="查看紀錄"
                            delay={0.4}
                        />
                    </Link>

                    <Link href="/leaderboard">
                        <ActionCard
                            icon={ChartNoAxesCombined}
                            title="排行榜"
                            desc="最強王者"
                            delay={0.5}
                        />
                    </Link>
                </section>
            </main>
        </div>
    )
}

// Sub-components

function StatBox({ icon: Icon, label, value, delay, highlight = false }: { icon: React.ElementType, label: string, value: number | string, delay: number, highlight?: boolean }) {
    return (
        <motion.div
            className={`flex flex-col items-center justify-center py-4 rounded-2xl bg-white border border-[#e2e8f0] shadow-sm transition-all`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
        >
            <Icon className="w-4 h-4 mb-2" />
            <p className={`text-2xl font-black ${highlight ? 'text-(--game-accent)' : 'text-(--game-fg)'} leading-none mb-1`}>{value}</p>
            <p className="text-sm font-bold text-(--game-muted-fg)">{label}</p>
        </motion.div>
    )
}

function ActionCard({ icon: Icon, title, desc, delay }: { icon: React.ElementType, title: string, desc: string, delay: number }) {
    return (
        <motion.div
            className="bg-white p-5 rounded-2xl shadow-sm border border-[#e2e8f0] h-full flex flex-col items-center justify-center gap-3 hover:border-(--game-primary) hover:shadow-md transition-all cursor-pointer group"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="p-2.5 rounded-xl bg-(--game-muted) text-(--game-muted-fg) group-hover:bg-[#EFF6FF] group-hover:text-(--game-accent) transition-colors">
                <Icon className="w-5 h-5" />
            </div>
            <div className="text-center">
                <h4 className="font-bold text-(--game-fg) text-lg mb-0.5 group-hover:text-(--game-accent) transition-colors">{title}</h4>
                <p className="text-xs text-(--game-muted-fg) font-medium">{desc}</p>
            </div>
        </motion.div>
    )
}
