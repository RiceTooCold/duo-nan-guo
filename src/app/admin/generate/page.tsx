'use client'

import { useState, Suspense, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Sparkles, ArrowLeft, Loader2, CheckCircle, XCircle, Clock, Zap, RefreshCw, Eye, X } from 'lucide-react'
import { TargetLanguage, ExamQuestionType } from '@/generated/prisma'
import { languageConfig, getQuestionTypesForRank, getQuestionTypeLabel } from '@/lib/config'
import { useGeneration, GenerationParams, QuestionProgress, QuestionStatus } from '@/contexts/GenerationContext'

function formatTime(ms: number): string {
    const seconds = Math.ceil(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
}

function GeneratePageContent() {
    const searchParams = useSearchParams()
    const initialLang = (searchParams.get('lang') || 'JP') as TargetLanguage
    const initialRank = parseInt(searchParams.get('rank') || '3')

    const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>(initialLang)
    const [rank, setRank] = useState(initialRank)
    const [examQuestionType, setExamQuestionType] = useState<ExamQuestionType | 'auto'>('auto')
    const [topic, setTopic] = useState('')
    const [count, setCount] = useState(5)
    const [enableCritic, setEnableCritic] = useState(true)

    // Modal states
    const [showSavedModal, setShowSavedModal] = useState(false)
    const [showFailedModal, setShowFailedModal] = useState(false)

    const {
        state,
        canStartGeneration,
        isGenerating,
        estimateRemainingTime,
        runGeneration,
        abortGeneration,
        reset,
    } = useGeneration()

    const handleGenerate = useCallback(async () => {
        const params: GenerationParams = {
            targetLanguage,
            rank,
            examQuestionType,
            topic,
            count,
            enableCritic,
        }

        // Delegate SSE handling to context - continues even if user navigates away
        await runGeneration(params)
    }, [targetLanguage, rank, examQuestionType, topic, count, enableCritic, runGeneration])

    const handleAbort = useCallback(() => {
        abortGeneration()
    }, [abortGeneration])

    // Get question types available for the selected rank
    const questionTypes = getQuestionTypesForRank(targetLanguage, rank) || []
    const langConfig = languageConfig?.[targetLanguage]
    const estimatedTime = estimateRemainingTime()
    const showPipeline = state.status !== 'idle'

    // Safety check - if config not loaded yet, show basic loading state
    if (!langConfig) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">載入中...</p>
            </div>
        )
    }

    // Get current processing question
    const currentQuestion = state.questions.find(q =>
        ['generating', 'critiquing', 'retrying', 'saving'].includes(q.status)
    )

    // Get saved and failed questions
    const savedQuestions = state.questions.filter(q => q.status === 'saved')
    const failedQuestions = state.questions.filter(q => q.status === 'failed')

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">題庫生成器</h1>
                            <p className="text-xs text-muted-foreground">Generate Questions</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid lg:grid-cols-[380px_1fr] gap-8">
                    {/* Configuration Panel */}
                    <div className="space-y-6">
                        <div className={`p-6 rounded-2xl bg-muted/50 border border-border/50 transition-opacity ${isGenerating ? 'opacity-50 pointer-events-none' : ''}`}>
                            <h2 className="font-semibold mb-4">生成參數</h2>

                            {/* Language Selection */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">目標語言</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['JP', 'EN', 'KR', 'CN'] as const).map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => { setTargetLanguage(lang); setRank(1); setExamQuestionType('auto') }}
                                            disabled={isGenerating}
                                            className={`p-3 rounded-xl border text-left transition-all ${targetLanguage === lang
                                                ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/50'}`}
                                        >
                                            <span className="text-sm font-medium">{languageConfig[lang]?.examName}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Rank */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">難度分級</label>
                                <select
                                    value={rank}
                                    onChange={e => { setRank(Number(e.target.value)); setExamQuestionType('auto') }}
                                    disabled={isGenerating}
                                    className="w-full p-3 rounded-xl border border-border/50 bg-background text-sm focus:border-primary focus:outline-none"
                                >
                                    {Object.entries(langConfig?.ranks || {}).map(([r, label]) => (
                                        <option key={r} value={r}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Question Type */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">題型</label>
                                <select
                                    value={examQuestionType}
                                    onChange={e => setExamQuestionType(e.target.value as ExamQuestionType | 'auto')}
                                    disabled={isGenerating}
                                    className="w-full p-3 rounded-xl border border-border/50 bg-background text-sm focus:border-primary focus:outline-none"
                                >
                                    <option value="auto">自動依比例分配</option>
                                    {questionTypes.map((qt) => (
                                        <option key={qt.type} value={qt.type}>{getQuestionTypeLabel(qt.type)}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Topic */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">情境主題 (選填)</label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={e => setTopic(e.target.value)}
                                    disabled={isGenerating}
                                    placeholder="留空則每題隨機選擇情境"
                                    className="w-full p-3 rounded-xl border border-border/50 bg-background text-sm focus:border-primary focus:outline-none"
                                />
                            </div>

                            {/* Count */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">生成數量</label>
                                <div className="flex items-center gap-3">
                                    <input type="range" min={1} max={100} value={count} onChange={e => setCount(Number(e.target.value))} disabled={isGenerating} className="flex-1" />
                                    <span className="text-lg font-bold w-8 text-center">{count}</span>
                                </div>
                            </div>

                            {/* Critic Toggle */}
                            <div className="mb-6">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={enableCritic}
                                        onChange={e => setEnableCritic(e.target.checked)}
                                        disabled={isGenerating}
                                        className="w-5 h-5 rounded border-border/50"
                                    />
                                    <span className="text-sm">啟用 Critic 品質審查</span>
                                </label>
                            </div>

                            {/* Generate Button */}
                            <button
                                onClick={handleGenerate}
                                disabled={!canStartGeneration}
                                className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                <Sparkles className="w-5 h-5" />
                                開始生成
                            </button>
                        </div>
                    </div>

                    {/* Pipeline Visualization */}
                    <div className="min-h-[400px]">
                        {!showPipeline ? (
                            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                                <div>
                                    <Zap className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                    <p>設定參數後點擊開始生成</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Summary Header */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold">
                                            {state.status === 'complete' ? '生成完成！' :
                                                state.status === 'error' ? '發生錯誤' :
                                                    state.status === 'aborted' ? '已中止' :
                                                        '生成進行中...'}
                                        </h3>
                                        {isGenerating && estimatedTime !== null && (
                                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                                <Clock className="w-4 h-4" />
                                                預估剩餘 {formatTime(estimatedTime)}
                                            </p>
                                        )}
                                        {state.error && (
                                            <p className="text-sm text-destructive mt-1">{state.error}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        {isGenerating ? (
                                            <button onClick={handleAbort} className="py-2 px-4 rounded-lg border border-destructive/50 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors">
                                                中止
                                            </button>
                                        ) : (
                                            <button onClick={reset} className="py-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                                                重新開始
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div>
                                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-300 rounded-full"
                                            style={{ width: `${state.summary.total > 0 ? ((state.summary.saved + state.summary.failed) / state.summary.total) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                                        <span>{state.summary.saved + state.summary.failed} / {state.summary.total} 題</span>
                                    </div>
                                </div>

                                {/* Current Question Card */}
                                {currentQuestion && (
                                    <div className="p-5 rounded-xl border-2 border-primary bg-primary/5">
                                        {/* Header */}
                                        <div className="flex items-center gap-3 mb-3">
                                            {currentQuestion.status === 'generating' && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                                            {currentQuestion.status === 'critiquing' && <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />}
                                            {currentQuestion.status === 'retrying' && <RefreshCw className="w-5 h-5 text-orange-500 animate-spin" />}
                                            {currentQuestion.status === 'saving' && <Loader2 className="w-5 h-5 text-success animate-spin" />}
                                            <span className="font-semibold">Q{currentQuestion.index + 1}</span>
                                            {currentQuestion.type && (
                                                <span className="text-xs px-2 py-0.5 rounded bg-muted">
                                                    {getQuestionTypeLabel(currentQuestion.type)}
                                                </span>
                                            )}
                                            <span className="text-sm text-muted-foreground ml-auto">
                                                {currentQuestion.status === 'generating' && '生成中...'}
                                                {currentQuestion.status === 'critiquing' && '審查中...'}
                                                {currentQuestion.status === 'retrying' && `重試中 (${currentQuestion.retryCount})...`}
                                                {currentQuestion.status === 'saving' && '儲存中...'}
                                            </span>
                                        </div>

                                        {/* Topic */}
                                        {currentQuestion.topic && (
                                            <p className="text-xs text-muted-foreground mb-3">情境: {currentQuestion.topic}</p>
                                        )}

                                        {/* Stimulus - show when available */}
                                        {currentQuestion.stimulus && (
                                            <div className="p-3 rounded-lg bg-background border border-border/50 mb-3">
                                                <p className="text-sm">{currentQuestion.stimulus}</p>
                                            </div>
                                        )}

                                        {/* Options - show when available */}
                                        {currentQuestion.interaction && (
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                {(['a', 'b', 'c', 'd'] as const).map(key => (
                                                    <div
                                                        key={key}
                                                        className={`p-2 rounded-lg border ${key === currentQuestion.correctAnswer
                                                            ? 'bg-success/10 border-success/30 font-medium'
                                                            : 'bg-background border-border/50'
                                                            }`}
                                                    >
                                                        <span className={`font-bold mr-2 ${key === currentQuestion.correctAnswer ? 'text-success' : 'text-muted-foreground'}`}>
                                                            {key.toUpperCase()}.
                                                        </span>
                                                        {currentQuestion.interaction?.[key]}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Loading placeholder when no content yet */}
                                        {!currentQuestion.stimulus && currentQuestion.status === 'generating' && (
                                            <div className="h-20 rounded-lg bg-muted/50 animate-pulse flex items-center justify-center">
                                                <span className="text-xs text-muted-foreground">正在生成題目...</span>
                                            </div>
                                        )}
                                    </div>
                                )}



                                {/* Completion Message */}
                                {state.status === 'complete' && !currentQuestion && (
                                    <div className="p-6 rounded-xl border border-border bg-muted/30 text-center">
                                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success" />
                                        <p className="font-medium">生成完成！</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            成功 {state.summary.saved} 題，失敗 {state.summary.failed} 題
                                        </p>
                                    </div>
                                )}

                                {/* Stats Cards */}
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setShowSavedModal(true)}
                                        disabled={savedQuestions.length === 0}
                                        className="p-4 rounded-xl bg-success/10 border border-success/30 text-left hover:bg-success/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <CheckCircle className="w-5 h-5 text-success" />
                                            <span className="text-2xl font-bold text-success">{state.summary.saved}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                            已儲存
                                            {savedQuestions.length > 0 && <Eye className="w-3 h-3" />}
                                        </p>
                                    </button>

                                    <button
                                        onClick={() => setShowFailedModal(true)}
                                        disabled={failedQuestions.length === 0}
                                        className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-left hover:bg-destructive/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <XCircle className="w-5 h-5 text-destructive" />
                                            <span className="text-2xl font-bold text-destructive">{state.summary.failed}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                            未通過
                                            {failedQuestions.length > 0 && <Eye className="w-3 h-3" />}
                                        </p>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Saved Questions Modal */}
            {showSavedModal && (
                <Modal title={`已儲存題目 (${savedQuestions.length})`} onClose={() => setShowSavedModal(false)}>
                    <div className="space-y-4 max-h-full overflow-y-auto h-[calc(100vh-200px)] ">
                        {savedQuestions.map((q) => (
                            <div key={`saved-${q.index}`} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg">Q{q.index + 1}</span>
                                        {q.type && (
                                            <span className="text-xs px-2 py-0.5 rounded bg-muted">
                                                {getQuestionTypeLabel(q.type)}
                                            </span>
                                        )}
                                    </div>
                                    {q.score !== undefined && (
                                        <span className="text-sm font-medium text-success">{q.score}分</span>
                                    )}
                                </div>

                                {/* Topic */}
                                {q.topic && (
                                    <p className="text-xs text-muted-foreground mb-2">情境: {q.topic}</p>
                                )}

                                {/* Stimulus */}
                                {q.stimulus && (
                                    <div className="p-3 rounded-lg bg-muted/50 mb-3">
                                        <p className="text-sm">{q.stimulus}</p>
                                    </div>
                                )}

                                {/* Options */}
                                {q.interaction && (
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        {(['a', 'b', 'c', 'd'] as const).map(key => (
                                            <div
                                                key={key}
                                                className={`p-2 rounded-lg border ${key === q.correctAnswer
                                                    ? 'bg-success/10 border-success/30 font-medium'
                                                    : 'border-border/50'
                                                    }`}
                                            >
                                                <span className={`font-bold mr-2 ${key === q.correctAnswer ? 'text-success' : 'text-muted-foreground'}`}>
                                                    {key.toUpperCase()}.
                                                </span>
                                                {q.interaction?.[key]}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </Modal>
            )}

            {/* Failed Questions Modal */}
            {showFailedModal && (
                <Modal title={`未通過題目 (${failedQuestions.length})`} onClose={() => setShowFailedModal(false)}>
                    <div className="space-y-4 max-w-full overflow-y-auto h-[calc(100vh-200px)]">
                        {failedQuestions.map((q) => (
                            <div key={`failed-${q.index}`} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg">Q{q.index + 1}</span>
                                        {q.type && (
                                            <span className="text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground">
                                                {getQuestionTypeLabel(q.type)}
                                            </span>
                                        )}
                                        {q.topic && (
                                            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                                                {q.topic}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {q.score !== undefined && (
                                            <span className="text-sm font-medium text-destructive">{q.score}分</span>
                                        )}
                                        {q.retryCount !== undefined && q.retryCount > 0 && (
                                            <span className="text-xs text-muted-foreground">重試 {q.retryCount} 次</span>
                                        )}
                                    </div>
                                </div>


                                {/* Stimulus */}
                                {q.stimulus && (
                                    <div className="p-3 rounded-lg bg-muted/50 mb-3">
                                        <p className="text-sm">{q.stimulus}</p>
                                    </div>
                                )}

                                {/* Options */}
                                {q.interaction && (
                                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                        {(['a', 'b', 'c', 'd'] as const).map(key => (
                                            <div
                                                key={key}
                                                className={`p-2 rounded-lg border ${key === q.correctAnswer
                                                    ? 'bg-success/10 border-success/30 font-medium'
                                                    : 'border-border/50'
                                                    }`}
                                            >
                                                <span className={`font-bold mr-2 ${key === q.correctAnswer ? 'text-success' : 'text-muted-foreground'}`}>
                                                    {key.toUpperCase()}.
                                                </span>
                                                {q.interaction?.[key]}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Failure reason */}
                                {q.feedback && (
                                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs">
                                        <strong>未通過原因:</strong> {q.feedback}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </Modal>
            )}
        </div>
    )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="bg-background rounded-2xl shadow-xl max-w-2xl w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}

export default function GeneratePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        }>
            <GeneratePageContent />
        </Suspense>
    )
}
