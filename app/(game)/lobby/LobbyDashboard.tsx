'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Trophy, History, User, Sword, MessageCircle, Settings, LogOut, ChartNoAxesCombined, Flame, Crosshair, Zap, Gamepad } from 'lucide-react'
import { Avatar } from '@/components/game/Avatar'
import { signOut } from 'next-auth/react'
import type { UserDashboardStats } from '@/actions/game.server'
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
        <div className="min-h-dvh flex flex-col bg-[#F5F8FC] relative overflow-hidden">
            {/* Decorative BG */}
            <div className="absolute top-0 left-0 w-full h-[400px] bg-linear-to-b from-[#D5E3F7]/50 to-transparent -z-10" />
            <motion.div
                className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-[#A9C4EB]/20 rounded-full blur-3xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 5, repeat: Infinity }}
            />

            {/* Header / Player Command Center */}
            <header className="px-6 pt-8 pb-2">
                <div className="relative overflow-hidden rounded-3xl bg-[#F5F8FC] backdrop-blur-xl border border-white/40 p-5 shadow-xl shadow-[#5B8BD4]/5">
                    <div className="flex items-center gap-4">
                        {/* Avatar (MD) */}
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
                            {/* Simple border ring if needed, or keeping it clean as user removed pulse */}
                        </motion.div>

                        {/* User Info & Stats */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                {/* Top Row: Name & Level */}
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h2 className="text-xl font-black text-[#333] tracking-tight truncate max-w-[140px]">
                                        {session?.user?.name || 'Player'}
                                    </h2>
                                    <span className="bg-[#5B8BD4] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0">
                                        Lv.{stats.level}
                                    </span>
                                </div>

                                {/* Rank Title */}
                                <div className="flex items-center justify-between text-xs font-bold text-[#64748b] mb-2">
                                    <span>{rankTitle}</span>
                                    <span className="text-[10px] text-[#94a3b8] tracking-wider uppercase">XP {Math.round(xpProgress)}%</span>
                                </div>

                                {/* XP Progress Bar */}
                                <div className="h-1.5 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-linear-to-r from-[#5B8BD4] to-[#4A7BC4]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${xpProgress}%` }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                    />
                                </div>
                            </motion.div>
                        </div>

                        {/* Actions (Settings & Logout) */}
                        <div className="shrink-0 self-start -mt-1 -mr-1 flex flex-col items-center gap-1">
                            <Link href="/settings">
                                <motion.button
                                    className="p-2 bg-white/50 hover:bg-white rounded-full transition-colors"
                                    whileHover={{ rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <Settings className="w-4 h-4 text-[#64748b]" />
                                </motion.button>
                            </Link>

                            <motion.button
                                onClick={handleSignOut}
                                className="p-2 bg-white/50 hover:bg-white hover:text-red-500 rounded-full transition-colors"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <LogOut className="w-4 h-4 text-[#64748b] hover:text-red-500" />
                            </motion.button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Overview */}
            <section className="px-6 mb-6">
                <div className="grid grid-cols-2 gap-3">
                    <StatCard
                        icon={<Gamepad className="w-full h-full text-[#F59E0B]" />}
                        label="總場次"
                        value={stats.totalMatches.toString()}
                        delay={0.1}
                    />
                    <StatCard
                        icon={<Crosshair className="w-full h-full text-[#10B981]" />}
                        label="勝率"
                        value={`${stats.winRate}%`}
                        delay={0.2}
                    />
                    <StatCard
                        icon={<Flame className="w-full h-full text-[#EF4444]" />}
                        label="連勝"
                        value={stats.currentStreak.toString()}
                        delay={0.3}
                        highlight={stats.currentStreak > 2}
                    />
                    <StatCard
                        icon={<Zap className="w-full h-full text-[#8B5CF6]" />}
                        label="反應速度"
                        value={`${stats.avgSpeed}s`}
                        delay={0.4}
                    />
                </div>
            </section>

            {/* Main Content Area */}
            <main className="flex-1 px-6 flex flex-col gap-6 pb-6">

                {/* Hero / Start Battle */}
                <motion.section
                    className="relative"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="relative overflow-visible bg-linear-to-br from-[#5B8BD4] to-[#4A7BC4] rounded-3xl p-6 shadow-xl shadow-[#5B8BD4]/30 text-white min-h-[160px] flex flex-col justify-center">

                        {/* Mascot Image - Positioned absolutely to break out of container */}
                        <div className="absolute -right-4 -bottom-6 w-50 h-50 pointer-events-none">
                            <Image
                                src="/mascot-parrot.png"
                                alt="Coach Parrot"
                                width={200}
                                height={200}
                                className="object-contain drop-shadow-xl transform rotate-[-5deg]"
                            />
                        </div>

                        <div className="relative z-10 w-[65%]">
                            <h3 className="text-2xl font-bold mb-1">戰鬥時刻！</h3>
                            <p className="text-blue-100 text-sm mb-4 font-medium leading-relaxed">
                                加入競技場，測試你的實力！
                            </p>

                            <Link href="/room">
                                <motion.button
                                    className="px-6 py-3 bg-white text-[#5B8BD4] font-bold rounded-xl shadow-lg flex items-center gap-2 group"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Sword className="w-5 h-5 fill-current" />
                                    <span>開始對戰</span>
                                </motion.button>
                            </Link>
                        </div>

                        {/* Background Decor */}
                        <motion.div
                            className="absolute top-[-20%] left-[20%] w-20 h-20 bg-white/10 rounded-full blur-xl"
                            animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
                            transition={{ duration: 4, repeat: Infinity }}
                        />
                    </div>
                </motion.section>

                {/* Navigation Grid */}
                <section className="grid grid-cols-2 gap-4">
                    <Link href="/history">
                        <ActionCard
                            icon={<History className="w-5 h-5 text-[#8B5CF6]" />}
                            title="歷史戰績"
                            desc="查看紀錄"
                            color="bg-[#F3E8FF]"
                            delay={0.4}
                        />
                    </Link>

                    <Link href="/leaderboard">
                        <ActionCard
                            icon={<ChartNoAxesCombined className="w-5 h-5 text-[#F59E0B]" />}
                            title="排行榜"
                            desc="即將推出"
                            color="bg-[#FEF3C7]"
                            delay={0.6}
                        />
                    </Link>
                </section>
            </main>
        </div>
    )
}

// Sub-components

function StatCard({ icon, label, value, delay, highlight = false }: { icon: React.ReactNode, label: string, value: string, delay: number, highlight?: boolean }) {
    return (
        <motion.div
            className={`bg-white p-3 rounded-2xl shadow-sm border ${highlight ? 'border-[#EF4444]/30 bg-[#FEF2F2]' : 'border-[#e2e8f0]'} flex flex-col items-center justify-center text-center gap-1`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
        >
            <div className="w-6 h-6">{icon}</div>
            <p className="text-2xl font-black text-[#333] leading-none">{value}</p>
            <p className="text-xs uppercase tracking-wider font-bold text-[#94a3b8]">{label}</p>
        </motion.div>
    )
}

function ActionCard({ icon, title, desc, color, delay }: { icon: React.ReactNode, title: string, desc: string, color: string, delay: number }) {
    return (
        <motion.div
            className="bg-white p-4 rounded-2xl shadow-sm border border-[#e2e8f0] h-full flex flex-col items-start gap-3 hover:border-[#5B8BD4]/50 transition-colors cursor-pointer group"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className={`p-2.5 rounded-xl ${color} group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <div>
                <h4 className="font-bold text-[#333] text-sm">{title}</h4>
                <p className="text-xs text-[#64748b]">{desc}</p>
            </div>
        </motion.div>
    )
}
