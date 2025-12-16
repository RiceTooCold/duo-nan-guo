'use client'

import Link from 'next/link'
import { Sparkles, PlusCircle, ChevronRight, Database, TrendingUp } from 'lucide-react'
import { TargetLanguage } from '@/generated/prisma'
import { languageConfig } from '@/lib/config/factory'
import { useEffect, useState } from 'react'

interface BankData {
    lang: TargetLanguage
    rank: number
    total: number
    avgScore: number | null
}

interface Stats {
    total: number
    humanTouched: number
}

export default function AdminBankPage() {
    const [stats, setStats] = useState<Stats>({ total: 0, humanTouched: 0 })
    const [banksData, setBanksData] = useState<BankData[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                const [statsRes, banksRes] = await Promise.all([
                    fetch('/api/questions/stats'),
                    fetch('/api/banks')
                ])
                if (statsRes.ok) {
                    setStats(await statsRes.json())
                }
                if (banksRes.ok) {
                    setBanksData(await banksRes.json())
                }
            } catch {
                console.error('Failed to fetch data')
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // Create a lookup map for quick access
    const bankLookup = new Map<string, { total: number; avgScore: number | null }>()
    for (const bank of banksData) {
        bankLookup.set(`${bank.lang}-${bank.rank}`, { total: bank.total, avgScore: bank.avgScore })
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">Duo-Nan-Guo</h1>
                                <p className="text-xs text-muted-foreground">Question Banks</p>
                            </div>
                        </Link>
                    </div>
                    <Link
                        href="/admin/generate"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        <PlusCircle className="w-4 h-4" />
                        生成題庫
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Overall Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        label="題目總數"
                        value={stats.total}
                        icon={<Database className="w-5 h-5" />}
                    />
                    <StatCard
                        label="題庫數量"
                        value={banksData.length}
                        icon={<TrendingUp className="w-5 h-5" />}
                    />
                    <StatCard
                        label="平均審查分數"
                        value={banksData.reduce((sum, b) => sum + (b.avgScore ?? 0) * b.total, 0) / Math.max(1, banksData.reduce((sum, b) => sum + b.total, 0))}
                        icon={<Database className="w-5 h-5" />}
                    />
                    <StatCard
                        label="人工修改"
                        value={stats.humanTouched}
                        icon={<Database className="w-5 h-5" />}
                    />
                </div>

                {/* Language Sections */}
                {(['JP', 'EN', 'KR', 'CN'] as const).map(lang => {
                    const config = languageConfig[lang]
                    const langTotal = banksData.filter(b => b.lang === lang).reduce((sum, b) => sum + b.total, 0)

                    return (
                        <section key={lang} className="mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <div>
                                    <h2 className="text-lg font-semibold">{config.examName}</h2>
                                    <p className="text-xs text-muted-foreground">
                                        {config.name} • {langTotal.toLocaleString()} 題目
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                {Object.keys(config.ranks).map(rankStr => {
                                    const rank = parseInt(rankStr)
                                    const bankKey = `${lang}-${rank}`
                                    const bankData = bankLookup.get(bankKey)
                                    const total = bankData?.total ?? 0
                                    const avgScore = bankData?.avgScore ?? null

                                    return (
                                        <BankCard
                                            key={rank}
                                            lang={lang}
                                            rank={rank}
                                            rankLabel={config.ranks[rank]}
                                            examName={config.examName}
                                            total={total}
                                            avgScore={avgScore}
                                            colorClass={config.color}
                                        />
                                    )
                                })}
                            </div>
                        </section>
                    )
                })}
            </main>
        </div>
    )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
    return (
        <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground">{icon}</span>
            </div>
            <div className="text-2xl font-bold">{typeof value === 'number' ? (Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)) : value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
        </div>
    )
}

function BankCard({
    lang,
    rank,
    rankLabel,
    examName,
    total,
    avgScore,
    colorClass,
}: {
    lang: string
    rank: number
    rankLabel: string
    examName: string
    total: number
    avgScore: number | null
    colorClass: string
}) {
    const hasQuestions = total > 0

    return (
        <Link
            href={`/admin/bank/${lang}/${rank}`}
            className={`group p-4 rounded-xl border transition-all ${colorClass} ${hasQuestions ? '' : 'opacity-50'
                }`}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{examName}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm font-semibold mb-1">{rankLabel}</div>
            <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{total}</span>
                {avgScore !== null && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${avgScore >= 70 ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                        }`}>
                        {avgScore.toFixed(0)}分
                    </span>
                )}
            </div>
        </Link>
    )
}
