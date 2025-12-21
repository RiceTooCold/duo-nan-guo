/**
 * Game UI Configuration
 * 
 * Frontend-specific language and level configurations for the game UI.
 * Derived from factory.ts but simplified for UI display purposes.
 */

import type { TargetLanguage } from '@/generated/prisma'

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
