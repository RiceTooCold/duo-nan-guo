/**
 * Shared Context
 * 
 * Unified context structure shared by Generator and Critic
 * Ensures all roles have consistent understanding of question context
 */

import { ExamQuestionType, TargetLanguage } from '@prisma/client'
import { languageConfig, getRankLabel } from '@/lib/config/factory'

export interface SharedContext {
    /** Exam type */
    exam: 'JLPT' | 'TOEIC' | 'TOPIK' | 'HSK'
    /** Level label (e.g. 'N3', 'Gold Certificate') */
    level: string
    /** Question type code */
    questionType: ExamQuestionType
    /** Topic/context */
    topic?: string
}

/**
 * Create SharedContext from generation parameters
 */
export function createSharedContext(
    targetLanguage: TargetLanguage,
    rank: number,
    examQuestionType: ExamQuestionType,
    topic?: string
): SharedContext {
    const config = languageConfig[targetLanguage]

    return {
        exam: config.examName as SharedContext['exam'],
        level: getRankLabel(targetLanguage, rank),
        questionType: examQuestionType,
        topic,
    }
}

/**
 * Format SharedContext as prompt text
 */
export function formatContextForPrompt(ctx: SharedContext): string {
    let text = `Exam: ${ctx.exam}\n`
    text += `Level: ${ctx.level}\n`
    text += `Question Type: ${ctx.questionType}\n`
    if (ctx.topic) {
        text += `Topic: ${ctx.topic}\n`
    }
    return text
}
