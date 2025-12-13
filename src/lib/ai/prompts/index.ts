import { ExamQuestionType } from '@/generated/prisma'
import { getToeicPrompt } from './toeic'
import { getJlptPrompt } from './jlpt'
import { getTopikPrompt } from './topik'
import { getHskPrompt } from './hsk'

// Re-export from centralized config
export {
    languageConfig,
    getLanguageConfig,
    getQuestionTypesForRank,
    getQuestionTypeValuesForRank,
    getAllQuestionTypes,
    getQuestionTypeLabel,
    getPercentageMapForRank,
    getRandomTopic,
    getTopics,
    getRankLabel,
    isQuestionTypeAvailableForRank,
} from '@/lib/config'

export interface PromptConfig {
    systemPrompt: string
    userPromptTemplate: (params: {
        rank: number
        topic?: string
        count: number
    }) => string
}

// Get prompt configuration for a specific exam question type
export function getPromptConfig(examQuestionType: ExamQuestionType): PromptConfig {
    if (examQuestionType.startsWith('toeic_')) {
        return getToeicPrompt(examQuestionType)
    }
    if (examQuestionType.startsWith('jlpt_')) {
        return getJlptPrompt(examQuestionType)
    }
    if (examQuestionType.startsWith('topik_')) {
        return getTopikPrompt(examQuestionType)
    }
    if (examQuestionType.startsWith('hsk_')) {
        return getHskPrompt(examQuestionType)
    }
    throw new Error(`Unknown exam question type: ${examQuestionType}`)
}
