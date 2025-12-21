import { NextRequest } from 'next/server'
import { TargetLanguage, ExamQuestionType } from '@/generated/prisma'
import {
    generateSingleQuestion,
    generateBatchAndSample,
    createGenerationPlan,
    GeneratedQuestion,
    critiqueQuestion,
    createQuestion,
    getExistingQuestionsForDedup,
    getRandomTopic
} from '@/lib/factory'
import { randomUUID } from 'crypto'


export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_RETRIES = 2

interface GenerateRequest {
    targetLanguage: TargetLanguage
    rank: number
    examQuestionType: ExamQuestionType | null
    topic: string | null
    count: number
    enableCritic: boolean
}

type QuestionStatus = 'pending' | 'generating' | 'critiquing' | 'retrying' | 'saving' | 'saved' | 'failed'

interface QuestionProgress {
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

export async function POST(request: NextRequest) {
    const body: GenerateRequest = await request.json()
    const { targetLanguage, rank, examQuestionType, topic, count, enableCritic } = body

    const encoder = new TextEncoder()
    const batchId = randomUUID()

    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: Record<string, unknown>) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
            }

            // Track per-question status
            const questions: QuestionProgress[] = Array.from({ length: count }, (_, i) => ({
                index: i,
                status: 'pending' as QuestionStatus,
            }))

            const sendQuestionUpdate = (index: number, updates: Partial<QuestionProgress>) => {
                questions[index] = { ...questions[index], ...updates }
                send({
                    type: 'question-update',
                    question: questions[index],
                    summary: {
                        total: count,
                        generating: questions.filter(q => q.status === 'generating').length,
                        critiquing: questions.filter(q => q.status === 'critiquing').length,
                        retrying: questions.filter(q => q.status === 'retrying').length,
                        saved: questions.filter(q => q.status === 'saved').length,
                        failed: questions.filter(q => q.status === 'failed').length,
                    },
                })
            }

            try {
                // Create generation plan
                let plan: { examQuestionType: ExamQuestionType; topic: string }[]

                if (examQuestionType === null) {
                    plan = createGenerationPlan(targetLanguage, rank, count)
                } else {
                    plan = Array.from({ length: count }, () => ({
                        examQuestionType: examQuestionType,
                        topic: topic || getRandomTopic(targetLanguage, rank),
                    }))
                }

                send({ type: 'start', total: plan.length, batchId })

                // Pre-fetch existing questions for dedup (per question type + topic)
                const existingByType = new Map<string, { stimulus: string; correctAnswer: string; interaction: { a: string; b: string; c: string; d: string } }[]>()

                // Process each question through the pipeline
                for (let i = 0; i < plan.length; i++) {
                    const { examQuestionType: type, topic: questionTopic } = plan[i]

                    // Lazy load existing questions for dedup (by type only, not topic)
                    const cacheKey = type
                    if (!existingByType.has(cacheKey)) {
                        const existing = await getExistingQuestionsForDedup(targetLanguage, rank, type, 50)
                        existingByType.set(cacheKey, existing)
                    }
                    const existingQuestions = existingByType.get(cacheKey) || []

                    let question: GeneratedQuestion | null = null
                    let criticScore: number | undefined
                    let criticFeedback: string | undefined
                    let approved = false
                    let retryCount = 0

                    // Retry loop
                    while (retryCount <= MAX_RETRIES && !approved) {
                        const isRetry = retryCount > 0

                        // Step 1: Generate (batch + sample for diversity)
                        sendQuestionUpdate(i, {
                            status: isRetry ? 'retrying' : 'generating',
                            topic: questionTopic,
                            type,
                            retryCount: isRetry ? retryCount : undefined,
                        })

                        // Collect existing stimuli for diversity scoring
                        const existingStimuli = existingQuestions.map(q => q.stimulus)

                        const genResult = await generateBatchAndSample(
                            targetLanguage,
                            rank,
                            type,
                            questionTopic,
                            existingStimuli,
                            isRetry && question ? { feedback: criticFeedback!, originalQuestion: question } : undefined
                        )

                        if (!genResult.success || genResult.questions.length === 0) {
                            retryCount++
                            continue
                        }

                        question = genResult.questions[0]

                        // Step 2: Critique (if enabled)
                        if (enableCritic) {
                            // Send question data when entering critique phase
                            sendQuestionUpdate(i, {
                                status: 'critiquing',
                                stimulus: question.stimulus,
                                interaction: question.interaction,
                                correctAnswer: question.correctAnswer,
                                explanation: question.explanation,
                            })

                            const criticResult = await critiqueQuestion({
                                question,
                                targetLanguage,
                                examQuestionType: type,
                                rank,
                                topic: questionTopic,
                                existingQuestions,
                            })

                            criticScore = criticResult.score
                            criticFeedback = criticResult.feedback
                            approved = criticResult.approved

                            if (!approved) {
                                retryCount++
                                continue
                            }
                        } else {
                            approved = true
                        }
                    }

                    // Final status after retry loop
                    if (!approved || !question) {
                        sendQuestionUpdate(i, {
                            status: 'failed',
                            score: criticScore,
                            feedback: criticFeedback,
                            retryCount,
                            // Include question data if available (for display)
                            stimulus: question?.stimulus,
                            interaction: question?.interaction,
                            correctAnswer: question?.correctAnswer,
                            explanation: question?.explanation,
                        })
                        continue
                    }

                    // Step 3: Save
                    sendQuestionUpdate(i, { status: 'saving' })

                    try {
                        await createQuestion({
                            targetLanguage,
                            rank,
                            examQuestionType: type,
                            topic: questionTopic,
                            stimulus: question.stimulus,
                            interaction: question.interaction,
                            correctAnswer: question.correctAnswer,
                            explanation: question.explanation,
                            criticScore,
                            criticFeedback,
                            generationBatch: batchId,
                        })

                        // Add to existing questions for subsequent dedup checks
                        existingQuestions.push({
                            stimulus: question.stimulus,
                            correctAnswer: question.correctAnswer,
                            interaction: question.interaction,
                        })

                        sendQuestionUpdate(i, {
                            status: 'saved',
                            score: criticScore,
                            stimulus: question.stimulus,
                            interaction: question.interaction,
                            correctAnswer: question.correctAnswer,
                            explanation: question.explanation,
                        })
                    } catch {
                        sendQuestionUpdate(i, {
                            status: 'failed',
                            feedback: 'Database save error',
                        })
                    }
                }

                // Complete
                const savedCount = questions.filter(q => q.status === 'saved').length
                const failedCount = questions.filter(q => q.status === 'failed').length

                send({
                    type: 'complete',
                    savedCount,
                    failedCount,
                    batchId,
                })

            } catch (error) {
                send({
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Unknown error occurred',
                    savedCount: questions.filter(q => q.status === 'saved').length,
                })
            } finally {
                controller.close()
            }
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    })
}
