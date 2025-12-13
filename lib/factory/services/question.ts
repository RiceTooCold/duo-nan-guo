import prisma from '@/lib/prisma'
import { Question, TargetLanguage, ExamQuestionType, Prisma } from '@/generated/prisma'
import { GeneratedQuestion } from './generator'
import { CriticResult } from '../ai/role/critic'

export interface CreateQuestionInput {
    targetLanguage: TargetLanguage
    rank: number
    examQuestionType: ExamQuestionType
    topic?: string
    stimulus: string
    interaction: GeneratedQuestion['interaction']
    correctAnswer: string
    explanation?: string
    criticScore?: number
    criticFeedback?: string
    generationBatch?: string
}

export interface QuestionFilter {
    targetLanguage?: TargetLanguage
    rank?: number
    examQuestionType?: ExamQuestionType
    isHumanTouched?: boolean
    generationBatch?: string
}

export interface PaginationParams {
    page: number
    pageSize: number
    sortBy?: 'createdAt' | 'updatedAt' | 'criticScore'
    sortOrder?: 'asc' | 'desc'
}

/**
 * Create a new question
 */
export async function createQuestion(input: CreateQuestionInput): Promise<Question> {
    return prisma.question.create({
        data: {
            targetLanguage: input.targetLanguage,
            rank: input.rank,
            examQuestionType: input.examQuestionType,
            topic: input.topic,
            stimulus: input.stimulus,
            interaction: input.interaction as Prisma.InputJsonValue,
            correctAnswer: input.correctAnswer,
            explanation: input.explanation,
            criticScore: input.criticScore,
            criticFeedback: input.criticFeedback,
            generationBatch: input.generationBatch,
        },
    })
}

/**
 * Create multiple questions from generation results
 * Uses batch insert for efficiency
 * Supports per-question examQuestionType and topic
 */
export async function createQuestionsFromGeneration(
    questions: GeneratedQuestion[],
    criticResults: CriticResult[],
    metadata: {
        targetLanguage: TargetLanguage
        rank: number
        examQuestionType: ExamQuestionType  // Default/fallback type
        topic?: string  // Default/fallback topic
        generationBatch: string
    }
): Promise<Question[]> {
    // Filter to only approved questions (or all if no critic results)
    const questionsToSave = questions.filter((_, i) => {
        const criticResult = criticResults[i]
        return !criticResult || criticResult.approved
    })

    if (questionsToSave.length === 0) {
        return []
    }

    // Prepare data for batch insert
    const data = questionsToSave.map((question, i) => {
        // Find original index to get correct critic result
        const originalIndex = questions.indexOf(question)
        const criticResult = criticResults[originalIndex]

        return {
            targetLanguage: metadata.targetLanguage,
            rank: metadata.rank,
            examQuestionType: question.examQuestionType || metadata.examQuestionType,
            topic: question.topic || metadata.topic,
            stimulus: question.stimulus,
            interaction: question.interaction as Prisma.InputJsonValue,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            criticScore: criticResult?.score,
            criticFeedback: criticResult?.feedback,
            generationBatch: metadata.generationBatch,
        }
    })

    // Batch insert
    await prisma.question.createMany({
        data,
    })

    // Fetch the created questions to return them
    const created = await prisma.question.findMany({
        where: {
            generationBatch: metadata.generationBatch,
        },
        orderBy: { createdAt: 'asc' },
    })

    return created
}

/**
 * Get existing questions for deduplication check
 * Returns full question info for comprehensive comparison
 * Only returns approved questions (critic score >= 80 or human-edited)
 * Filters by language, rank, questionType, and optionally topic
 */
export async function getExistingQuestionsForDedup(
    targetLanguage: TargetLanguage,
    rank: number,
    examQuestionType: ExamQuestionType,
    limit: number = 50,
    topic?: string
): Promise<{
    stimulus: string
    correctAnswer: string
    interaction: { a: string; b: string; c: string; d: string }
}[]> {
    const questions = await prisma.question.findMany({
        where: {
            targetLanguage,
            rank,
            examQuestionType,
            ...(topic && { topic }), // Filter by topic if provided
            OR: [
                { criticScore: { gte: 80 } },
                { isHumanTouched: true },
            ],
        },
        select: {
            stimulus: true,
            correctAnswer: true,
            interaction: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    })

    // Parse interaction JSON and return typed result
    return questions.map(q => ({
        stimulus: q.stimulus,
        correctAnswer: q.correctAnswer,
        interaction: q.interaction as { a: string; b: string; c: string; d: string },
    }))
}

/**
 * Get questions with filtering and pagination
 */
export async function getQuestions(
    filter: QuestionFilter,
    pagination: PaginationParams
): Promise<{ questions: Question[]; total: number }> {
    const where: Prisma.QuestionWhereInput = {}

    if (filter.targetLanguage) where.targetLanguage = filter.targetLanguage
    if (filter.rank) where.rank = filter.rank
    if (filter.examQuestionType) where.examQuestionType = filter.examQuestionType
    if (filter.isHumanTouched !== undefined) where.isHumanTouched = filter.isHumanTouched
    if (filter.generationBatch) where.generationBatch = filter.generationBatch

    const sortField = pagination.sortBy || 'createdAt'
    const sortOrder = pagination.sortOrder || 'desc'

    const [questions, total] = await Promise.all([
        prisma.question.findMany({
            where,
            skip: (pagination.page - 1) * pagination.pageSize,
            take: pagination.pageSize,
            orderBy: { [sortField]: sortOrder },
        }),
        prisma.question.count({ where }),
    ])

    return { questions, total }
}

/**
 * Get a single question by ID
 */
export async function getQuestionById(id: string): Promise<Question | null> {
    return prisma.question.findUnique({ where: { id } })
}

/**
 * Update a question (marks as human-touched)
 */
export async function updateQuestion(
    id: string,
    data: Partial<Omit<CreateQuestionInput, 'targetLanguage' | 'rank' | 'examQuestionType'>>
): Promise<Question> {
    return prisma.question.update({
        where: { id },
        data: {
            ...data,
            interaction: data.interaction as Prisma.InputJsonValue | undefined,
            isHumanTouched: true, // Mark as touched when human edits
            updatedAt: new Date(),
        },
    })
}

/**
 * Delete a question (only if not human-touched, unless force is true)
 */
export async function deleteQuestion(id: string, force = false): Promise<boolean> {
    const question = await prisma.question.findUnique({ where: { id } })

    if (!question) return false

    // Protect human-touched questions unless force delete
    if (question.isHumanTouched && !force) {
        throw new Error('Cannot delete human-touched question. Use force=true to override.')
    }

    await prisma.question.delete({ where: { id } })
    return true
}

/**
 * Check for duplicate questions (basic deduplication by stimulus)
 */
export async function isDuplicate(stimulus: string, targetLanguage: TargetLanguage): Promise<boolean> {
    const existing = await prisma.question.findFirst({
        where: {
            stimulus,
            targetLanguage,
        },
    })
    return existing !== null
}

/**
 * Get statistics for the question bank
 */
export async function getQuestionStats(): Promise<{
    total: number
    byLanguage: Record<string, number>
    byRank: Record<number, number>
    humanTouched: number
}> {
    const [total, byLanguageRaw, byRankRaw, humanTouched] = await Promise.all([
        prisma.question.count(),
        prisma.question.groupBy({
            by: ['targetLanguage'],
            _count: { _all: true },
        }),
        prisma.question.groupBy({
            by: ['rank'],
            _count: { _all: true },
        }),
        prisma.question.count({ where: { isHumanTouched: true } }),
    ])

    const byLanguage: Record<string, number> = {}
    for (const item of byLanguageRaw) {
        byLanguage[item.targetLanguage] = item._count._all
    }

    const byRank: Record<number, number> = {}
    for (const item of byRankRaw) {
        byRank[item.rank] = item._count._all
    }

    return { total, byLanguage, byRank, humanTouched }
}

/**
 * Get detailed statistics for a specific question bank (language + rank combination)
 */
export async function getBankStats(
    targetLanguage: TargetLanguage,
    rank: number
): Promise<{
    total: number
    byType: Record<string, number>
    avgScore: number | null
    humanTouched: number
}> {
    const where = { targetLanguage, rank }

    const [total, byTypeRaw, scoreAgg, humanTouched] = await Promise.all([
        prisma.question.count({ where }),
        prisma.question.groupBy({
            by: ['examQuestionType'],
            where,
            _count: { _all: true },
        }),
        prisma.question.aggregate({
            where: { ...where, criticScore: { not: null } },
            _avg: { criticScore: true },
        }),
        prisma.question.count({ where: { ...where, isHumanTouched: true } }),
    ])

    const byType: Record<string, number> = {}
    for (const item of byTypeRaw) {
        byType[item.examQuestionType] = item._count._all
    }

    return {
        total,
        byType,
        avgScore: scoreAgg._avg.criticScore,
        humanTouched,
    }
}

/**
 * Get overview statistics for all question banks
 */
export async function getAllBanksOverview(): Promise<{
    lang: TargetLanguage
    rank: number
    total: number
    avgScore: number | null
}[]> {
    // Get counts and scores grouped by language and rank
    const countsByBank = await prisma.question.groupBy({
        by: ['targetLanguage', 'rank'],
        _count: { _all: true },
        _avg: { criticScore: true },
    })

    return countsByBank.map(item => ({
        lang: item.targetLanguage,
        rank: item.rank,
        total: item._count._all,
        avgScore: item._avg.criticScore,
    }))
}
