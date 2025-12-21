import { z } from 'zod'
import { ExamQuestionType, TargetLanguage } from '@/generated/prisma'
import { generatorModel } from '@/lib/factory/ai/gemini'
import { getPromptConfig, getRandomTopic } from '@/lib/factory/ai/prompts'
import { rateLimiter } from '@/lib/factory/utils/rate-limiter'

// Zod schema for validating generated questions
export const GeneratedQuestionSchema = z.object({
    stimulus: z.string().min(1),
    interaction: z.object({
        a: z.string().min(1),
        b: z.string().min(1),
        c: z.string().min(1),
        d: z.string().min(1),
    }),
    correctAnswer: z.enum(['a', 'b', 'c', 'd']),
    explanation: z.string().optional(),
})

export const GeneratedQuestionsArraySchema = z.array(GeneratedQuestionSchema)

// Extended type with question type and topic attached
export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema> & {
    examQuestionType?: ExamQuestionType
    topic?: string  // The topic used for this question
}

export interface GenerationParams {
    targetLanguage: TargetLanguage
    rank: number
    examQuestionType: ExamQuestionType
    topic?: string
    count: number
}

export interface GenerationResult {
    questions: GeneratedQuestion[]
    examQuestionType?: ExamQuestionType
    topic?: string
    rawResponse: string
    success: boolean
    error?: string
    rateLimited?: boolean
    retryAfter?: number
}

// Retry configuration for rate limiting
const RETRY_CONFIG = {
    maxRetries: 3,
    initialDelayMs: 2000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
}

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase()
        return message.includes('429') ||
            message.includes('rate limit') ||
            message.includes('quota') ||
            message.includes('resource exhausted')
    }
    return false
}

// Batch generation configuration
const BATCH_DIVERSITY_CONFIG = {
    batchSize: 5,  // Generate 5 questions per call
}

/**
 * Calculate simple text similarity (Jaccard index on words)
 */
function calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))
    const intersection = new Set([...words1].filter(w => words2.has(w)))
    const union = new Set([...words1, ...words2])
    return intersection.size / union.size
}

/**
 * Score diversity of a question against existing questions
 * Higher score = more different from existing
 */
function scoreDiversity(
    question: GeneratedQuestion,
    existingStimuli: string[]
): number {
    if (existingStimuli.length === 0) return 1.0

    const similarities = existingStimuli.map(existing =>
        calculateSimilarity(question.stimulus, existing)
    )
    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length

    return 1 - avgSimilarity
}

/**
 * Select the most diverse question from a batch
 */
function selectMostDiverse(
    candidates: GeneratedQuestion[],
    existingStimuli: string[]
): GeneratedQuestion {
    if (candidates.length === 0) {
        throw new Error('No candidates to select from')
    }
    if (candidates.length === 1) {
        return candidates[0]
    }

    const scoredCandidates = candidates.map((candidate, index) => {
        const existingDiversity = scoreDiversity(candidate, existingStimuli)
        const otherCandidates = candidates.filter((_, i) => i !== index)
        const batchDiversity = scoreDiversity(
            candidate,
            otherCandidates.map(c => c.stimulus)
        )
        const totalScore = existingDiversity * 0.7 + batchDiversity * 0.3
        return { candidate, score: totalScore }
    })

    scoredCandidates.sort((a, b) => b.score - a.score)
    return scoredCandidates[0].candidate
}

/**
 * Generate a single question using Gemini Flash model
 * Uses the shared rate limiter and returns one question with metadata attached
 */
export async function generateSingleQuestion(
    targetLanguage: TargetLanguage,
    rank: number,
    examQuestionType: ExamQuestionType,
    topic?: string,
    retryContext?: {
        feedback: string
        originalQuestion: GeneratedQuestion
    }
): Promise<GenerationResult> {
    // Use provided topic or randomly select one
    const resolvedTopic = topic || getRandomTopic(targetLanguage, rank)

    // Get the prompt configuration for this question type
    const promptConfig = getPromptConfig(examQuestionType)

    // Build the full prompt (always count=1)
    let userPrompt = promptConfig.userPromptTemplate({ rank, topic: resolvedTopic, count: 1 })

    // Add retry context with original question and feedback
    if (retryContext) {
        const { feedback, originalQuestion } = retryContext
        userPrompt += `

=== RETRY REQUEST ===
Your previous question:
Stimulus: ${originalQuestion.stimulus}
Options: A) ${originalQuestion.interaction.a} B) ${originalQuestion.interaction.b} C) ${originalQuestion.interaction.c} D) ${originalQuestion.interaction.d}
Answer: ${originalQuestion.correctAnswer}

Reviewer feedback:
${feedback}

Please address the feedback:
- If issue is "duplicate_concept", generate a completely NEW question
- For other issues (e.g. multiple_correct), fix the original question
=== END RETRY ===`
    }

    let lastError: Error | null = null
    let delayMs = RETRY_CONFIG.initialDelayMs

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        try {
            // Acquire rate limit token before making the call
            await rateLimiter.acquire()

            const result = await generatorModel.generateContent([
                { text: promptConfig.systemPrompt },
                { text: userPrompt },
            ])

            const response = result.response
            const text = response.text()

            // Parse and validate the JSON response
            let parsed: unknown
            try {
                parsed = JSON.parse(text)
            } catch {
                // Try to extract JSON from markdown code blocks
                const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[1])
                } else {
                    throw new Error('Could not parse JSON response')
                }
            }

            // Handle both array and single object responses
            const questionsArray = Array.isArray(parsed) ? parsed : [parsed]
            const validated = GeneratedQuestionsArraySchema.safeParse(questionsArray)

            if (!validated.success) {
                return {
                    questions: [],
                    rawResponse: text,
                    success: false,
                    error: `Validation failed: ${validated.error.message}`,
                }
            }

            // Attach metadata to the question
            const questionsWithMeta = validated.data.map(q => ({
                ...q,
                examQuestionType,
                topic: resolvedTopic,
            }))

            return {
                questions: questionsWithMeta,
                examQuestionType,
                topic: resolvedTopic,
                rawResponse: text,
                success: true,
            }
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))

            if (isRateLimitError(error) && attempt < RETRY_CONFIG.maxRetries) {
                // Rate limit hit, wait and retry
                await sleep(delayMs)
                delayMs = Math.min(delayMs * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelayMs)
                continue
            }

            return {
                questions: [],
                rawResponse: '',
                success: false,
                error: lastError.message,
                rateLimited: isRateLimitError(error),
            }
        }
    }

    return {
        questions: [],
        rawResponse: '',
        success: false,
        error: lastError?.message || 'Max retries exceeded',
        rateLimited: true,
    }
}

/**
 * Generate a batch of questions and select the most diverse one
 * This increases variety by generating multiple candidates and picking the best
 */
export async function generateBatchAndSample(
    targetLanguage: TargetLanguage,
    rank: number,
    examQuestionType: ExamQuestionType,
    topic?: string,
    existingStimuli?: string[],
    retryContext?: {
        feedback: string
        originalQuestion: GeneratedQuestion
    }
): Promise<GenerationResult> {
    const resolvedTopic = topic || getRandomTopic(targetLanguage, rank)
    const promptConfig = getPromptConfig(examQuestionType)
    const batchSize = BATCH_DIVERSITY_CONFIG.batchSize

    // Build prompt requesting multiple diverse questions
    let userPrompt = promptConfig.userPromptTemplate({ rank, topic: resolvedTopic, count: batchSize })

    // Add diversity instruction
    userPrompt += `

DIVERSITY REQUIREMENT:
Generate ${batchSize} DIFFERENT questions. Each question must:
- Test a DIFFERENT grammar point, vocabulary item, or concept
- Use a DIFFERENT sentence structure
- Avoid repeating patterns from other questions in this batch
`

    // Add retry context if provided
    if (retryContext) {
        const { feedback, originalQuestion } = retryContext
        userPrompt += `

=== RETRY REQUEST ===
Your previous question:
Stimulus: ${originalQuestion.stimulus}
Options: A) ${originalQuestion.interaction.a} B) ${originalQuestion.interaction.b} C) ${originalQuestion.interaction.c} D) ${originalQuestion.interaction.d}
Answer: ${originalQuestion.correctAnswer}

Reviewer feedback:
${feedback}

Please generate ${batchSize} NEW questions that address the feedback.
=== END RETRY ===`
    }

    let lastError: Error | null = null
    let delayMs = RETRY_CONFIG.initialDelayMs

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        try {
            await rateLimiter.acquire()

            const result = await generatorModel.generateContent([
                { text: promptConfig.systemPrompt },
                { text: userPrompt },
            ])

            const response = result.response
            const text = response.text()

            // Parse JSON response
            let parsed: unknown
            try {
                parsed = JSON.parse(text)
            } catch {
                const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[1])
                } else {
                    throw new Error('Could not parse JSON response')
                }
            }

            const questionsArray = Array.isArray(parsed) ? parsed : [parsed]
            const validated = GeneratedQuestionsArraySchema.safeParse(questionsArray)

            if (!validated.success) {
                return {
                    questions: [],
                    rawResponse: text,
                    success: false,
                    error: `Validation failed: ${validated.error.message}`,
                }
            }

            // Attach metadata to all questions
            const questionsWithMeta: GeneratedQuestion[] = validated.data.map(q => ({
                ...q,
                examQuestionType,
                topic: resolvedTopic,
            }))

            // Select the most diverse question
            const selected = selectMostDiverse(
                questionsWithMeta,
                existingStimuli || []
            )

            return {
                questions: [selected],
                examQuestionType,
                topic: resolvedTopic,
                rawResponse: text,
                success: true,
            }
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))

            if (isRateLimitError(error) && attempt < RETRY_CONFIG.maxRetries) {
                await sleep(delayMs)
                delayMs = Math.min(delayMs * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelayMs)
                continue
            }

            return {
                questions: [],
                rawResponse: '',
                success: false,
                error: lastError.message,
                rateLimited: isRateLimitError(error),
            }
        }
    }

    return {
        questions: [],
        rawResponse: '',
        success: false,
        error: lastError?.message || 'Max retries exceeded',
        rateLimited: true,
    }
}

/**
 * Generate questions using Gemini Flash model with retry for rate limits
 * Legacy function - generates multiple questions in one call
 */
export async function generateQuestions(
    params: GenerationParams,
    onRetry?: (attempt: number, delayMs: number) => void
): Promise<GenerationResult> {
    const { targetLanguage, rank, examQuestionType, count } = params

    // Get topic - use provided or auto-resolve based on level
    const topic = params.topic || getRandomTopic(targetLanguage, rank)

    // Get the prompt configuration for this question type
    const promptConfig = getPromptConfig(examQuestionType)

    // Build the full prompt
    const userPrompt = promptConfig.userPromptTemplate({ rank, topic, count })

    let lastError: Error | null = null
    let delayMs = RETRY_CONFIG.initialDelayMs

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        try {
            // Acquire rate limit token before making the call
            await rateLimiter.acquire()

            const result = await generatorModel.generateContent([
                { text: promptConfig.systemPrompt },
                { text: userPrompt },
            ])

            const response = result.response
            const text = response.text()

            // Parse and validate the JSON response
            let parsed: unknown
            try {
                parsed = JSON.parse(text)
            } catch {
                // Try to extract JSON from markdown code blocks
                const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[1])
                } else {
                    throw new Error('Could not parse JSON response')
                }
            }

            // Validate with Zod
            const validated = GeneratedQuestionsArraySchema.safeParse(parsed)

            if (!validated.success) {
                return {
                    questions: [],
                    rawResponse: text,
                    success: false,
                    error: `Validation failed: ${validated.error.message}`,
                }
            }

            return {
                questions: validated.data,
                examQuestionType,
                topic,
                rawResponse: text,
                success: true,
            }
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))

            if (isRateLimitError(error) && attempt < RETRY_CONFIG.maxRetries) {
                if (onRetry) {
                    onRetry(attempt + 1, delayMs)
                }
                await sleep(delayMs)
                delayMs = Math.min(delayMs * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelayMs)
                continue
            }

            return {
                questions: [],
                rawResponse: '',
                success: false,
                error: lastError.message,
                rateLimited: isRateLimitError(error),
            }
        }
    }

    return {
        questions: [],
        rawResponse: '',
        success: false,
        error: lastError?.message || 'Max retries exceeded',
        rateLimited: true,
    }
}

/**
 * Plan for batch generation - calculates the questions to generate
 */
export interface QuestionPlan {
    examQuestionType: ExamQuestionType
    topic: string
}

/**
 * Create a generation plan for batch generation
 * Each question gets a random topic assigned
 */
export function createGenerationPlan(
    targetLanguage: TargetLanguage,
    rank: number,
    totalCount: number
): QuestionPlan[] {
    const { getPercentageMapForRank, getQuestionTypeValuesForRank } = require('@/lib/config/factory')

    const percentages = getPercentageMapForRank(targetLanguage, rank)
    const types = getQuestionTypeValuesForRank(targetLanguage, rank)

    const plan: QuestionPlan[] = []

    for (const type of types) {
        const percentage = percentages[type] || 0
        const count = Math.max(1, Math.round((percentage / 100) * totalCount))

        for (let i = 0; i < count; i++) {
            plan.push({
                examQuestionType: type,
                topic: getRandomTopic(targetLanguage, rank),
            })
        }
    }

    // Shuffle the plan for variety
    for (let i = plan.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[plan[i], plan[j]] = [plan[j], plan[i]]
    }

    return plan.slice(0, totalCount)
}

/**
 * Generate questions one at a time based on a plan
 * Each question is generated with its own topic
 * Uses rate limiter to control API call frequency
 */
export async function generateQuestionsFromPlan(
    targetLanguage: TargetLanguage,
    rank: number,
    plan: QuestionPlan[],
    onProgress?: (completed: number, total: number, question?: GeneratedQuestion) => void
): Promise<GeneratedQuestion[]> {
    const questions: GeneratedQuestion[] = []

    for (let i = 0; i < plan.length; i++) {
        const { examQuestionType, topic } = plan[i]

        const result = await generateSingleQuestion(
            targetLanguage,
            rank,
            examQuestionType,
            topic
        )

        if (result.success && result.questions.length > 0) {
            const question = result.questions[0]
            questions.push(question)
            onProgress?.(i + 1, plan.length, question)
        } else {
            // Still report progress even on failure
            onProgress?.(i + 1, plan.length, undefined)
        }
    }

    return questions
}

/**
 * Generate a batch of questions across multiple types based on design spec percentages
 * LEGACY: This function is kept for backward compatibility
 * Each question will have its examQuestionType attached
 */
export async function generateBatchByPercentage(
    targetLanguage: TargetLanguage,
    rank: number,
    totalCount: number,
    topic?: string
): Promise<GenerationResult[]> {
    const { getPercentageMapForRank, getQuestionTypeValuesForRank } = await import('@/lib/config/factory')

    const percentages = getPercentageMapForRank(targetLanguage, rank)
    const types = getQuestionTypeValuesForRank(targetLanguage, rank)

    const results: GenerationResult[] = []

    for (const type of types) {
        const percentage = percentages[type] || 0
        const count = Math.max(1, Math.round((percentage / 100) * totalCount))

        const result = await generateQuestions({
            targetLanguage,
            rank,
            examQuestionType: type,
            topic,
            count,
        })

        // Attach question type to each question
        if (result.success) {
            result.questions = result.questions.map(q => ({
                ...q,
                examQuestionType: type,
            }))
        }

        results.push(result)
    }

    return results
}
