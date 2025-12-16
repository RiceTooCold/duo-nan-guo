'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, PlusCircle, ChevronLeft, ChevronRight, Trash2, Edit, Eye, CheckCircle, AlertCircle, BarChart3, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { TargetLanguage, ExamQuestionType } from '@/generated/prisma'
import { languageConfig, getQuestionTypeLabel } from '@/lib/config/factory'

interface QuestionData {
    id: string
    targetLanguage: TargetLanguage
    rank: number
    examQuestionType: ExamQuestionType
    topic: string | null
    stimulus: string
    interaction: { a: string; b: string; c: string; d: string }
    correctAnswer: string
    explanation: string | null
    criticScore: number | null
    criticFeedback: string | null
    isHumanTouched: boolean
    createdAt: string
}

interface BankStats {
    total: number
    byType: Record<string, number>
    avgScore: number | null
    humanTouched: number
}

export default function BankDetailPage() {
    const params = useParams()
    const lang = params.lang as string
    const rank = parseInt(params.rank as string)

    const config = languageConfig[lang as TargetLanguage]
    const bankName = config ? `${config.examName} ${config.ranks[rank]}` : `${lang} Rank ${rank}`

    const [stats, setStats] = useState<BankStats | null>(null)
    const [questions, setQuestions] = useState<QuestionData[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [pageSize] = useState(10)

    // Filters and sorting
    const [filterType, setFilterType] = useState<string>('')
    const [filterHumanTouched, setFilterHumanTouched] = useState<string>('')
    const [sortBy, setSortBy] = useState<string>('createdAt')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    // Fetch stats once on mount
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(`/api/banks/${lang}/${rank}`)
            if (res.ok) {
                setStats(await res.json())
            }
        } catch {
            console.error('Failed to fetch stats')
        }
    }, [lang, rank])

    // Fetch questions when filters change
    const fetchQuestions = useCallback(async () => {
        setLoading(true)
        try {
            const queryParams = new URLSearchParams({
                lang,
                rank: String(rank),
                page: String(page),
                pageSize: String(pageSize),
                sortBy,
                sortOrder,
            })
            if (filterType) queryParams.set('type', filterType)
            if (filterHumanTouched) queryParams.set('humanTouched', filterHumanTouched)

            const res = await fetch(`/api/questions?${queryParams.toString()}`)
            if (res.ok) {
                const data = await res.json()
                setQuestions(data.questions)
                setTotal(data.total)
            }
        } catch {
            console.error('Failed to fetch questions')
        } finally {
            setLoading(false)
        }
    }, [lang, rank, page, pageSize, filterType, filterHumanTouched, sortBy, sortOrder])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    useEffect(() => {
        fetchQuestions()
    }, [fetchQuestions])

    const handleDelete = async (id: string) => {
        if (!confirm('確定要刪除這道題目嗎？')) return

        try {
            const response = await fetch(`/api/questions/${id}`, { method: 'DELETE' })
            if (response.ok) {
                fetchQuestions()
            } else {
                const data = await response.json()
                alert(data.error || 'Failed to delete')
            }
        } catch {
            alert('Failed to delete question')
        }
    }

    const [clearing, setClearing] = useState(false)

    const handleClearBank = async () => {
        // Build filter description for confirmation
        const filterParts: string[] = []
        if (filterType) filterParts.push(`題型「${getQuestionTypeLabel(filterType)}」`)
        if (filterHumanTouched === 'true') filterParts.push('「已修改」')
        else if (filterHumanTouched === 'false') filterParts.push('「未修改」')

        const filterDesc = filterParts.length > 0 ? filterParts.join(' + ') : '全部'
        const hasFilters = filterType || filterHumanTouched

        if (!confirm(`確定要刪除 ${bankName} 中符合條件的題目嗎？\n\n篩選條件：${filterDesc}`)) return
        if (!hasFilters && !confirm(`再次確認：這將刪除所有 ${stats?.total ?? 0} 道題目，包括人工編輯過的。確定繼續？`)) return

        setClearing(true)
        try {
            // Build query params with current filters
            const queryParams = new URLSearchParams()
            if (filterHumanTouched) queryParams.set('humanTouched', filterHumanTouched)
            if (filterType) queryParams.set('type', filterType)

            const url = `/api/banks/${lang}/${rank}/clear` + (queryParams.toString() ? `?${queryParams.toString()}` : '')
            const response = await fetch(url, { method: 'DELETE' })
            const data = await response.json()

            if (response.ok) {
                alert(`已刪除 ${data.deletedCount} 道題目`)
                fetchStats()
                fetchQuestions()
            } else {
                alert(data.error || '刪除失敗')
            }
        } catch {
            alert('刪除題目時發生錯誤')
        } finally {
            setClearing(false)
        }
    }

    const totalPages = Math.ceil(total / pageSize)

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin/bank"
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">{bankName}</h1>
                                <p className="text-xs text-muted-foreground">
                                    {stats?.total ?? 0} 道題目
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {(stats?.total ?? 0) > 0 && (
                            <button
                                onClick={handleClearBank}
                                disabled={clearing}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/50 text-destructive text-sm font-medium hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                            >
                                {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                {filterType || filterHumanTouched ? '刪除篩選結果' : '清空題庫'}
                            </button>
                        )}
                        <Link
                            href={`/admin/generate?lang=${lang}&rank=${rank}`}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            <PlusCircle className="w-4 h-4" />
                            生成新題目
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Statistics */}
                {stats && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            題庫統計
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <StatCard label="總題數" value={stats.total} />
                            <StatCard
                                label="平均審查分數"
                                value={stats.avgScore !== null ? `${stats.avgScore.toFixed(1)}` : '-'}
                            />
                            <StatCard label="人工修改" value={stats.humanTouched} />
                            <StatCard label="題型數" value={Object.keys(stats.byType).length} />
                        </div>

                        {/* Type Distribution */}
                        {Object.keys(stats.byType).length > 0 && (
                            <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                                <h3 className="text-sm font-medium mb-3">題型分布</h3>
                                <div className="space-y-2">
                                    {Object.entries(stats.byType).map(([type, count]) => {
                                        const percentage = (count / stats.total) * 100
                                        return (
                                            <div key={type} className="flex items-center gap-3">
                                                <div className="w-24 text-xs text-muted-foreground truncate">
                                                    {getQuestionTypeLabel(type)}
                                                </div>
                                                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary/60 rounded-full transition-all"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                                <div className="w-12 text-xs text-right">{count}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Question List */}
                <div>
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <h2 className="text-lg font-semibold">題目列表</h2>
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Type Filter */}
                            <select
                                value={filterType}
                                onChange={e => { setFilterType(e.target.value); setPage(1) }}
                                className="px-3 py-1.5 rounded-lg border border-border/50 bg-background text-sm focus:border-primary focus:outline-none"
                            >
                                <option value="">所有題型</option>
                                {stats && Object.keys(stats.byType).map(type => (
                                    <option key={type} value={type}>{getQuestionTypeLabel(type)}</option>
                                ))}
                            </select>

                            {/* Human Touched Filter - 3 State */}
                            <div className="flex items-center rounded-lg border border-border/50 overflow-hidden">
                                {[
                                    { value: '', label: '全部' },
                                    { value: 'true', label: '已修改' },
                                    { value: 'false', label: '未修改' },
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => { setFilterHumanTouched(opt.value); setPage(1) }}
                                        className={`px-3 py-1.5 text-sm transition-colors ${filterHumanTouched === opt.value
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-muted'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            <div className="w-px h-6 bg-border/50" />

                            {/* Sort Buttons */}
                            {[
                                { key: 'createdAt', label: '建立' },
                                { key: 'updatedAt', label: '修改' },
                                { key: 'criticScore', label: '分數' },
                            ].map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => {
                                        if (sortBy === key) {
                                            setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
                                        } else {
                                            setSortBy(key)
                                            setSortOrder('desc')
                                        }
                                        setPage(1)
                                    }}
                                    className={`px-3 py-1.5 rounded-lg border text-sm flex items-center gap-1 transition-colors ${sortBy === key
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border/50 hover:border-primary/50'
                                        }`}
                                >
                                    {label}
                                    {sortBy === key ? (
                                        sortOrder === 'desc' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />
                                    ) : (
                                        <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-muted-foreground">載入中...</p>
                        </div>
                    ) : questions.length === 0 ? (
                        <div className="text-center py-12 rounded-xl bg-muted/30 border border-border/50">
                            <BarChart3 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">此題庫目前沒有題目</p>
                            <Link
                                href={`/admin/generate?lang=${lang}&rank=${rank}`}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                            >
                                <PlusCircle className="w-4 h-4" />
                                生成新題目
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {questions.map(question => (
                                <QuestionRow
                                    key={question.id}
                                    question={question}
                                    onDelete={() => handleDelete(question.id)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-8 flex items-center justify-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-lg border border-border/50 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="px-4 py-2 text-sm">
                                第 {page} / {totalPages} 頁
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded-lg border border-border/50 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="p-4 rounded-xl bg-muted/50 border border-border/50 text-center">
            <div className="text-2xl font-bold mb-1">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
        </div>
    )
}

function QuestionRow({ question, onDelete }: { question: QuestionData; onDelete: () => void }) {
    return (
        <div className="p-5 rounded-2xl bg-background border border-border/50 hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted">
                            {getQuestionTypeLabel(question.examQuestionType)}
                        </span>
                        {question.topic && (
                            <span className="px-2 py-0.5 rounded text-xs bg-muted/50 text-muted-foreground">
                                {question.topic}
                            </span>
                        )}
                        {question.isHumanTouched && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning flex items-center gap-1">
                                <Edit className="w-3 h-3" />
                                人工修改
                            </span>
                        )}
                        {question.criticScore !== null && (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${question.criticScore >= 70
                                ? 'bg-success/10 text-success'
                                : 'bg-warning/10 text-warning'
                                }`}>
                                {question.criticScore >= 70 ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                {question.criticScore}/100
                            </span>
                        )}
                    </div>

                    {/* Stimulus */}
                    <p className="text-sm leading-relaxed line-clamp-2">{question.stimulus}</p>

                    {/* Options Preview */}
                    <div className="mt-3 flex flex-wrap gap-2">
                        {(['a', 'b', 'c', 'd'] as const).map(key => (
                            <span
                                key={key}
                                className={`px-2 py-1 rounded text-xs ${key === question.correctAnswer
                                    ? 'bg-success/10 text-success font-medium'
                                    : 'bg-muted/50 text-muted-foreground'
                                    }`}
                            >
                                {key.toUpperCase()}: {question.interaction[key]?.slice(0, 20)}
                                {(question.interaction[key]?.length || 0) > 20 ? '...' : ''}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <Link
                        href={`/admin/questions/${question.id}`}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="查看詳情"
                    >
                        <Eye className="w-4 h-4" />
                    </Link>
                    <Link
                        href={`/admin/questions/${question.id}/edit`}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="編輯"
                    >
                        <Edit className="w-4 h-4" />
                    </Link>
                    <button
                        onClick={onDelete}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        title="刪除"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
