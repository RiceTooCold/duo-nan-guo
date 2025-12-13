'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'

interface QuestionData {
    id: string
    targetLanguage: string
    rank: number
    examQuestionType: string
    topic: string | null
    stimulus: string
    interaction: { a: string; b: string; c: string; d: string }
    correctAnswer: string
    explanation: string | null
}

// Use centralized config
import { languageConfig, getQuestionTypeLabel, getRankLabel } from '@/lib/config'
import { TargetLanguage } from '@/generated/prisma'

export default function EditQuestionPage() {
    const router = useRouter()
    const params = useParams()
    const id = params.id as string

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [question, setQuestion] = useState<QuestionData | null>(null)

    const [stimulus, setStimulus] = useState('')
    const [optionA, setOptionA] = useState('')
    const [optionB, setOptionB] = useState('')
    const [optionC, setOptionC] = useState('')
    const [optionD, setOptionD] = useState('')
    const [correctAnswer, setCorrectAnswer] = useState<'a' | 'b' | 'c' | 'd'>('a')
    const [explanation, setExplanation] = useState('')
    const [topic, setTopic] = useState('')

    useEffect(() => {
        async function fetchQuestion() {
            try {
                const response = await fetch(`/api/questions/${id}`)
                if (response.ok) {
                    const data = await response.json()
                    setQuestion(data)
                    setStimulus(data.stimulus)
                    setOptionA(data.interaction.a)
                    setOptionB(data.interaction.b)
                    setOptionC(data.interaction.c)
                    setOptionD(data.interaction.d)
                    setCorrectAnswer(data.correctAnswer)
                    setExplanation(data.explanation || '')
                    setTopic(data.topic || '')
                }
            } catch {
                console.error('Failed to fetch question')
            } finally {
                setLoading(false)
            }
        }

        fetchQuestion()
    }, [id])

    const handleSave = async () => {
        setSaving(true)

        try {
            const response = await fetch(`/api/questions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stimulus,
                    interaction: {
                        a: optionA,
                        b: optionB,
                        c: optionC,
                        d: optionD,
                    },
                    correctAnswer,
                    explanation: explanation || null,
                    topic: topic || null,
                }),
            })

            if (response.ok) {
                router.push(`/admin/questions/${id}`)
            } else {
                const data = await response.json()
                alert(data.error || 'Failed to save')
            }
        } catch {
            alert('Failed to save question')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!question) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">題目不存在</p>
            </div>
        )
    }

    const langInfo = languageConfig[question.targetLanguage as TargetLanguage]

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/admin/questions/${id}`}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">編輯題目</h1>
                            <p className="text-xs text-muted-foreground">Edit Question</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        儲存
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* Metadata (readonly) */}
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
                </div>

                <div className="space-y-6">
                    {/* Topic */}
                    <div>
                        <label className="block text-sm font-medium mb-2">情境主題</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            placeholder="選填"
                            className="w-full p-3 rounded-xl border border-border/50 bg-background text-sm focus:border-primary focus:outline-none"
                        />
                    </div>

                    {/* Stimulus */}
                    <div>
                        <label className="block text-sm font-medium mb-2">題目 *</label>
                        <textarea
                            value={stimulus}
                            onChange={e => setStimulus(e.target.value)}
                            rows={4}
                            className="w-full p-3 rounded-xl border border-border/50 bg-background text-sm focus:border-primary focus:outline-none resize-none"
                        />
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium">選項 *</label>
                        {(['a', 'b', 'c', 'd'] as const).map(key => {
                            const values = { a: optionA, b: optionB, c: optionC, d: optionD }
                            const setters = { a: setOptionA, b: setOptionB, c: setOptionC, d: setOptionD }

                            return (
                                <div key={key} className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setCorrectAnswer(key)}
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${correctAnswer === key
                                            ? 'bg-success text-white'
                                            : 'bg-muted hover:bg-muted/80'
                                            }`}
                                    >
                                        {key.toUpperCase()}
                                    </button>
                                    <input
                                        type="text"
                                        value={values[key]}
                                        onChange={e => setters[key](e.target.value)}
                                        className="flex-1 p-3 rounded-xl border border-border/50 bg-background text-sm focus:border-primary focus:outline-none"
                                    />
                                </div>
                            )
                        })}
                        <p className="text-xs text-muted-foreground">點擊字母按鈕設定正確答案</p>
                    </div>

                    {/* Explanation */}
                    <div>
                        <label className="block text-sm font-medium mb-2">解說</label>
                        <textarea
                            value={explanation}
                            onChange={e => setExplanation(e.target.value)}
                            rows={3}
                            placeholder="選填 - 解釋為何此答案正確"
                            className="w-full p-3 rounded-xl border border-border/50 bg-background text-sm focus:border-primary focus:outline-none resize-none"
                        />
                    </div>
                </div>

                {/* Warning */}
                <div className="mt-8 p-4 rounded-xl bg-warning/10 border border-warning/30">
                    <p className="text-sm text-warning">
                        ⚠️ 儲存後此題目將被標記為「人工修改」，AI 將不會覆蓋此題目。
                    </p>
                </div>
            </main>
        </div>
    )
}
