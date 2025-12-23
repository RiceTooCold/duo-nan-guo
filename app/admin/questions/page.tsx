'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Search, Filter, ChevronLeft, ChevronRight, Trash2, Edit, Eye, CheckCircle, AlertCircle } from 'lucide-react'
import { TargetLanguage, ExamQuestionType } from '@prisma/client'

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

// Use centralized config
import { languageConfig, getQuestionTypeLabel, getRankLabel } from '@/lib/config/factory'

function QuestionsContent() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const initialLang = searchParams.get('lang') || ''
    const initialRank = searchParams.get('rank') || ''
    const initialPage = parseInt(searchParams.get('page') || '1')

    const [questions, setQuestions] = useState<QuestionData[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(initialPage)
    const [pageSize] = useState(10)

    const [filterLang, setFilterLang] = useState(initialLang)
    const [filterRank, setFilterRank] = useState(initialRank)
    const [showFilters, setShowFilters] = useState(false)

    const fetchQuestions = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.set('page', page.toString())
            params.set('pageSize', pageSize.toString())
            if (filterLang) params.set('lang', filterLang)
            if (filterRank) params.set('rank', filterRank)

            const response = await fetch(`/api/questions?${params}`)
            if (response.ok) {
                const data = await response.json()
                setQuestions(data.questions)
                setTotal(data.total)
            }
        } catch {
            console.error('Failed to fetch questions')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, filterLang, filterRank])

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
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">題庫瀏覽</h1>
                            <p className="text-xs text-muted-foreground">共 {total} 道題目</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Filters */}
                {showFilters && (
                    <div className="mb-6 p-4 rounded-xl bg-muted/50 border border-border/50 flex flex-wrap gap-4">
                        <div>
                            <label className="block text-xs font-medium mb-1">語言</label>
                            <select
                                value={filterLang}
                                onChange={e => { setFilterLang(e.target.value); setPage(1) }}
                                className="px-3 py-2 rounded-lg border border-border/50 bg-background text-sm"
                            >
                                <option value="">全部</option>
                                <option value="EN">🇺🇸 TOEIC</option>
                                <option value="JP">🇯🇵 JLPT</option>
                                <option value="KR">🇰🇷 TOPIK</option>
                                <option value="CN">🇨🇳 HSK</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">難度</label>
                            <select
                                value={filterRank}
                                onChange={e => { setFilterRank(e.target.value); setPage(1) }}
                                className="px-3 py-2 rounded-lg border border-border/50 bg-background text-sm"
                            >
                                <option value="">全部</option>
                                {[1, 2, 3, 4, 5, 6].map(r => (
                                    <option key={r} value={r}>Rank {r}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Questions List */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">載入中...</p>
                    </div>
                ) : questions.length === 0 ? (
                    <div className="text-center py-12">
                        <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground">沒有找到題目</p>
                        <Link
                            href="/admin/generate"
                            className="inline-block mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                        >
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
            </main>
        </div>
    )
}

function QuestionRow({ question, onDelete }: { question: QuestionData; onDelete: () => void }) {
    const langInfo = languageConfig[question.targetLanguage as TargetLanguage]

    return (
        <div className="p-5 rounded-2xl bg-background border border-border/50 hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-lg">{langInfo?.icon}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted">
                            {langInfo?.examName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted">
                            {getRankLabel(question.targetLanguage as TargetLanguage, question.rank)}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted">
                            {getQuestionTypeLabel(question.examQuestionType)}
                        </span>
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

export default function QuestionsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <QuestionsContent />
        </Suspense>
    )
}
