import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Edit, CheckCircle, AlertCircle, Clock, Sparkles } from 'lucide-react'
import { getQuestionById } from '@/lib/factory'
import { languageConfig, getQuestionTypeLabel, getRankLabel } from '@/lib/config/factory'
import { TargetLanguage } from '@prisma/client'

export default async function QuestionDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const question = await getQuestionById(id)

    if (!question) {
        notFound()
    }

    const langInfo = languageConfig[question.targetLanguage as TargetLanguage]
    const interaction = question.interaction as { a: string; b: string; c: string; d: string }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/admin/bank/${question.targetLanguage}/${question.rank}`}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">題目詳情</h1>
                            <p className="text-xs text-muted-foreground">Question Detail</p>
                        </div>
                    </div>
                    <Link
                        href={`/admin/questions/${question.id}/edit`}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        <Edit className="w-4 h-4" />
                        編輯
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className="text-2xl">{langInfo?.icon}</span>
                    <span className="px-3 py-1 rounded-lg text-sm font-medium bg-muted">
                        {langInfo?.examName}
                    </span>
                    <span className="px-3 py-1 rounded-lg text-sm font-medium bg-muted">
                        {getRankLabel(question.targetLanguage as TargetLanguage, question.rank)}
                    </span>
                    <span className="px-3 py-1 rounded-lg text-sm font-medium bg-muted">
                        {getQuestionTypeLabel(question.examQuestionType)}
                    </span>
                    {question.topic && (
                        <span className="px-3 py-1 rounded-lg text-sm font-medium bg-primary/10 text-primary">
                            {question.topic}
                        </span>
                    )}
                    {question.isHumanTouched && (
                        <span className="px-3 py-1 rounded-lg text-sm font-medium bg-warning/10 text-warning flex items-center gap-1">
                            <Edit className="w-3.5 h-3.5" />
                            人工修改
                        </span>
                    )}
                </div>

                {/* Question Card */}
                <div className="p-6 rounded-2xl bg-muted/30 border border-border/50 mb-6">
                    <h2 className="text-sm font-medium text-muted-foreground mb-3">題目</h2>
                    <p className="text-lg leading-relaxed">{question.stimulus}</p>
                </div>

                {/* Options */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {(['a', 'b', 'c', 'd'] as const).map(key => (
                        <div
                            key={key}
                            className={`p-4 rounded-xl border ${key === question.correctAnswer
                                ? 'bg-success/10 border-success/30'
                                : 'bg-background border-border/50'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${key === question.correctAnswer
                                    ? 'bg-success text-white'
                                    : 'bg-muted'
                                    }`}>
                                    {key.toUpperCase()}
                                </span>
                                <span className="flex-1">{interaction[key]}</span>
                                {key === question.correctAnswer && (
                                    <CheckCircle className="w-5 h-5 text-success" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Explanation */}
                {question.explanation && (
                    <div className="p-5 rounded-xl bg-info/10 border border-info/30 mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-info" />
                            <span className="text-sm font-medium text-info">解說</span>
                        </div>
                        <p className="text-sm">{question.explanation}</p>
                    </div>
                )}

                {/* Critic Feedback */}
                {question.criticScore !== null && (
                    <div className={`p-5 rounded-xl border mb-6 ${question.criticScore >= 70
                        ? 'bg-success/5 border-success/30'
                        : 'bg-warning/5 border-warning/30'
                        }`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {question.criticScore >= 70 ? (
                                    <CheckCircle className="w-5 h-5 text-success" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-warning" />
                                )}
                                <span className="font-medium">AI 審查結果</span>
                            </div>
                            <span className={`text-2xl font-bold ${question.criticScore >= 70 ? 'text-success' : 'text-warning'
                                }`}>
                                {question.criticScore}/100
                            </span>
                        </div>
                        {question.criticFeedback && (
                            <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {question.criticFeedback}
                            </pre>
                        )}
                    </div>
                )}

                {/* Metadata Footer */}
                <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        建立時間：{new Date(question.createdAt).toLocaleString('zh-TW')}
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        更新時間：{new Date(question.updatedAt).toLocaleString('zh-TW')}
                    </div>
                    {question.generationBatch && (
                        <div>
                            Batch: {question.generationBatch.slice(0, 8)}...
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
