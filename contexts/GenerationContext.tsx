'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from 'react'
import { TargetLanguage, ExamQuestionType } from '@/generated/prisma'

const STORAGE_KEY = 'duo-nan-guo:generation'

export type GenerationStatus = 'idle' | 'processing' | 'complete' | 'error' | 'aborted'
export type QuestionStatus = 'pending' | 'generating' | 'critiquing' | 'retrying' | 'saving' | 'saved' | 'failed'

export interface QuestionProgress {
    index: number
    status: QuestionStatus
    topic?: string
    type?: string
    score?: number
    feedback?: string
    retryCount?: number
    stimulus?: string
    interaction?: { a: string; b: string; c: string; d: string }
    correctAnswer?: string
    explanation?: string
}

export interface GenerationParams {
    targetLanguage: TargetLanguage
    rank: number
    examQuestionType: ExamQuestionType | 'auto'
    topic: string
    count: number
    enableCritic: boolean
}

export interface GenerationSummary {
    total: number
    generating: number
    critiquing: number
    retrying: number
    saved: number
    failed: number
}

export interface GenerationState {
    id: string
    status: GenerationStatus
    params: GenerationParams | null
    startedAt: number | null
    questions: QuestionProgress[]
    summary: GenerationSummary
    error?: string
}

const initialSummary: GenerationSummary = {
    total: 0,
    generating: 0,
    critiquing: 0,
    retrying: 0,
    saved: 0,
    failed: 0,
}

const initialState: GenerationState = {
    id: '',
    status: 'idle',
    params: null,
    startedAt: null,
    questions: [],
    summary: { ...initialSummary },
}

function loadFromStorage(): GenerationState | null {
    if (typeof window === 'undefined') return null
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            return JSON.parse(stored) as GenerationState
        }
    } catch {
        // Invalid storage data
    }
    return null
}

function saveToStorage(state: GenerationState): void {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
        // Storage full or unavailable
    }
}

function clearStorage(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
}

interface GenerationContextValue {
    state: GenerationState
    canStartGeneration: boolean
    isGenerating: boolean
    estimateRemainingTime: () => number | null
    startGeneration: (params: GenerationParams) => AbortSignal
    updateQuestion: (question: QuestionProgress, summary: GenerationSummary) => void
    setStatus: (status: GenerationStatus, error?: string) => void
    completeGeneration: (savedCount: number, failedCount: number) => void
    abortGeneration: () => void
    reset: () => void
    // SSE management
    runGeneration: (params: GenerationParams) => Promise<void>
    abortController: React.MutableRefObject<AbortController | null>
}

const GenerationContext = createContext<GenerationContextValue | null>(null)

export function useGeneration() {
    const context = useContext(GenerationContext)
    if (!context) {
        throw new Error('useGeneration must be used within GenerationProvider')
    }
    return context
}

export function GenerationProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<GenerationState>(initialState)
    const abortControllerRef = useRef<AbortController | null>(null)

    // Load from storage on mount
    useEffect(() => {
        const stored = loadFromStorage()
        if (stored) {
            const questions = stored.questions || []
            const summary = stored.summary || { ...initialSummary }

            if (stored.status === 'processing') {
                // Was interrupted, mark as error
                setState({
                    ...stored,
                    questions,
                    summary,
                    status: 'error',
                    error: '上次生成未完成。您可以重新開始。',
                })
            } else {
                setState({ ...stored, questions, summary })
            }
        }
    }, [])

    // Save to storage on state change
    useEffect(() => {
        if (state.status !== 'idle') {
            saveToStorage(state)
        }
    }, [state])

    const startGeneration = useCallback((params: GenerationParams) => {
        const id = `gen-${Date.now()}`
        abortControllerRef.current = new AbortController()

        const questions: QuestionProgress[] = Array.from({ length: params.count }, (_, i) => ({
            index: i,
            status: 'pending' as QuestionStatus,
        }))

        setState({
            id,
            status: 'processing',
            params,
            startedAt: Date.now(),
            questions,
            summary: { ...initialSummary, total: params.count },
        })

        return abortControllerRef.current.signal
    }, [])

    const updateQuestion = useCallback((question: QuestionProgress, summary: GenerationSummary) => {
        setState(prev => ({
            ...prev,
            questions: prev.questions.map(q =>
                q.index === question.index ? question : q
            ),
            summary,
        }))
    }, [])

    const setStatus = useCallback((status: GenerationStatus, error?: string) => {
        setState(prev => ({ ...prev, status, error }))
    }, [])

    const completeGeneration = useCallback((savedCount: number, failedCount: number) => {
        setState(prev => ({
            ...prev,
            status: 'complete',
            summary: {
                ...prev.summary,
                saved: savedCount,
                failed: failedCount,
                generating: 0,
                critiquing: 0,
                retrying: 0,
            },
        }))
    }, [])

    const abortGeneration = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        setState(prev => ({
            ...prev,
            status: 'aborted',
        }))
    }, [])

    const reset = useCallback(() => {
        clearStorage()
        abortControllerRef.current = null
        setState(initialState)
    }, [])

    const estimateRemainingTime = useCallback((): number | null => {
        if (!state.startedAt || state.summary.total === 0) return null
        const elapsed = Date.now() - state.startedAt
        const completed = state.summary.saved + state.summary.failed

        if (completed === 0) {
            return 4000 * state.summary.total
        }

        const avgTimePerQuestion = elapsed / completed
        return Math.round(avgTimePerQuestion * (state.summary.total - completed))
    }, [state.startedAt, state.summary])

    // Run generation SSE - this is the key function that runs the actual generation
    const runGeneration = useCallback(async (params: GenerationParams) => {
        const signal = startGeneration(params)

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetLanguage: params.targetLanguage,
                    rank: params.rank,
                    examQuestionType: params.examQuestionType === 'auto' ? null : params.examQuestionType,
                    topic: params.topic || null,
                    count: params.count,
                    enableCritic: params.enableCritic,
                }),
                signal,
            })

            if (!response.ok) throw new Error('Generation failed')

            const reader = response.body?.getReader()
            if (!reader) throw new Error('No response body')

            const decoder = new TextDecoder()
            let buffer = ''
            let savedCount = 0
            let failedCount = 0

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue
                    const jsonStr = line.slice(6)
                    if (jsonStr === '[DONE]') continue

                    try {
                        const event = JSON.parse(jsonStr)
                        if (event.type === 'question-update') {
                            const q = event.question  // API sends 'question', not 'data'
                            const questionProgress: QuestionProgress = {
                                index: q.index,
                                status: q.status,
                                topic: q.topic,
                                type: q.type,
                                score: q.score,
                                feedback: q.feedback,
                                retryCount: q.retryCount,
                                stimulus: q.stimulus,
                                interaction: q.interaction,
                                correctAnswer: q.correctAnswer,
                                explanation: q.explanation,
                            }

                            if (q.status === 'saved') savedCount++
                            if (q.status === 'failed') failedCount++

                            updateQuestion(questionProgress, {
                                total: params.count,
                                generating: event.summary?.generating || 0,
                                critiquing: event.summary?.critiquing || 0,
                                retrying: event.summary?.retrying || 0,
                                saved: savedCount,
                                failed: failedCount,
                            })
                        }
                    } catch {
                        // Skip invalid JSON
                    }
                }
            }

            completeGeneration(savedCount, failedCount)
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                setStatus('aborted')
            } else {
                setStatus('error', error instanceof Error ? error.message : 'Unknown error')
            }
        }
    }, [startGeneration, updateQuestion, completeGeneration, setStatus])

    const canStartGeneration = ['idle', 'complete', 'error', 'aborted'].includes(state.status)
    const isGenerating = state.status === 'processing'

    return (
        <GenerationContext.Provider
            value={{
                state,
                canStartGeneration,
                isGenerating,
                estimateRemainingTime,
                startGeneration,
                updateQuestion,
                setStatus,
                completeGeneration,
                abortGeneration,
                reset,
                runGeneration,
                abortController: abortControllerRef,
            }}
        >
            {children}
        </GenerationContext.Provider>
    )
}
