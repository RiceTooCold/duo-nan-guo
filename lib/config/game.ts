/**
 * Game UI Configuration
 * 
 * Frontend-specific language and level configurations for the game UI.
 * Derived from factory.ts but simplified for UI display purposes.
 */

import type { TargetLanguage } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GameLanguageConfig {
    id: TargetLanguage
    name: string          // 顯示名稱（中文）
    examName: string      // 考試名稱 (JLPT, TOEIC, etc.)
    flag: string          // emoji flag
    levels: string[]      // 等級標籤陣列 (由低到高)
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const gameLanguages: GameLanguageConfig[] = [
    {
        id: 'JP',
        name: '日文',
        examName: 'JLPT',
        flag: '🇯🇵',
        levels: ['N5', 'N4', 'N3', 'N2', 'N1'],
    },
    {
        id: 'EN',
        name: '英文',
        examName: 'TOEIC',
        flag: '🇺🇸',
        levels: ['橘色證書', '棕色證書', '綠色證書', '藍色證書', '金色證書'],
    },
    {
        id: 'KR',
        name: '韓文',
        examName: 'TOPIK',
        flag: '🇰🇷',
        levels: ['I 1급', 'I 2급', 'II 3급', 'II 4급', 'II 5급', 'II 6급'],
    },
    {
        id: 'CN',
        name: '中文',
        examName: 'HSK',
        flag: '🇨🇳',
        levels: ['1級', '2級', '3級', '4級', '5級', '6級'],
    },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/** Get language config by ID */
export function getGameLanguage(id: TargetLanguage): GameLanguageConfig | undefined {
    return gameLanguages.find(lang => lang.id === id)
}

/** Convert level label to rank number (1-indexed) */
export function levelToRank(langId: TargetLanguage, level: string): number {
    const lang = getGameLanguage(langId)
    if (!lang) return 1
    const index = lang.levels.indexOf(level)
    return index >= 0 ? index + 1 : 1
}

/** Convert rank number to level label */
export function rankToLevel(langId: TargetLanguage, rank: number): string {
    const lang = getGameLanguage(langId)
    if (!lang) return ''
    return lang.levels[rank - 1] || lang.levels[0]
}

/** Question count options */
export const questionCounts = [5, 10, 20] as const

// ─────────────────────────────────────────────────────────────────────────────
// Scoring Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const TIME_PER_QUESTION = 20; // seconds
export const SCORING_CONFIG = {
    /** Base score for correct answer */
    baseScore: 100,

    /** Maximum speed bonus points */
    speedBonusMax: 50,

    /** Speed bonus window as ratio of time limit (0.85 = 85%, more lenient for Vercel latency) */
    speedBonusWindowRatio: 0.85,

    /** Combo multipliers for streak (index = streak count, max at 5+) */
    comboMultipliers: [1.0, 1.1, 1.2, 1.3, 1.4, 1.5] as const,

    /** Time per question in milliseconds */
    timePerQuestionMs: 15000,
} as const

/**
 * Calculate score for an answer
 * 
 * Formula:
 * - Base: 100 points
 * - Speed Bonus: 0-50 points (linear decay, only within 70% of time limit)
 * - Combo Multiplier: 1.0x to 1.5x based on streak
 * 
 * @param isCorrect Whether the answer is correct
 * @param responseTimeMs Time taken to answer in milliseconds
 * @param streak Current correct answer streak (before this answer)
 * @returns Score earned (0 if incorrect)
 */
export function calculateScore(
    isCorrect: boolean,
    responseTimeMs: number,
    streak: number
): number {
    if (!isCorrect) return 0

    const { baseScore, speedBonusMax, speedBonusWindowRatio, comboMultipliers, timePerQuestionMs } = SCORING_CONFIG

    // Speed Window = 70% of 15s = 10.5s = 10500ms
    const speedWindowMs = timePerQuestionMs * speedBonusWindowRatio

    // Speed Bonus: linear decay within window (faster = more points)
    // If responseTime >= speedWindow, speedBonus = 0
    // If responseTime = 0, speedBonus = speedBonusMax (50)
    const speedRatio = Math.max(0, 1 - (responseTimeMs / speedWindowMs))
    const speedBonus = Math.round(speedBonusMax * speedRatio)

    // Combo Multiplier: streak 0 = 1.0x, 1 = 1.1x, ... 5+ = 1.5x
    const comboIndex = Math.min(streak, comboMultipliers.length - 1)
    const multiplier = comboMultipliers[comboIndex]

    return Math.round((baseScore + speedBonus) * multiplier)
}
