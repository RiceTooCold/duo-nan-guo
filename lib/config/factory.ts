/**
 * Centralized Configuration
 * 
 * All exam/language/question-type configs in one place
 * 
 * Structure:
 * - questionTypes: label definitions only (for display)
 * - questionTypesByRank: single source of truth for availability + percentages
 */

import { ExamQuestionType, TargetLanguage } from '@/generated/prisma'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Label-only config for display purposes */
export interface QuestionTypeLabelConfig {
    labelZh: string
    labelEn: string
}

/** Question type with percentage for a specific rank */
export interface RankQuestionTypeConfig {
    type: ExamQuestionType
    percentage: number
}

/** Full language configuration */
export interface LanguageConfig {
    name: string
    examName: string
    icon: string
    color: string
    ranks: Record<number, string>
    /** Label definitions for question types (display only) */
    questionTypes: Record<ExamQuestionType, QuestionTypeLabelConfig>
    /** Question types available per rank with percentages (single source of truth) */
    questionTypesByRank: Record<number, RankQuestionTypeConfig[]>
    topics: Record<number, string[]>
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const languageConfig: Record<TargetLanguage, LanguageConfig> = {
    EN: {
        name: 'English',
        examName: 'TOEIC',
        icon: '🇺🇸',
        color: 'bg-ink/10 border-ink/30 hover:border-ink/50',
        ranks: {
            1: '橘色證書（0-215）',
            2: '棕色證書（220-465）',
            3: '綠色證書（470-725）',
            4: '藍色證書（730-855）',
            5: '金色證書（860-990）',
        },
        questionTypes: {
            toeic_part5_pos: { labelZh: '詞性判斷', labelEn: 'Part of Speech' },
            toeic_part5_tense: { labelZh: '時態語態', labelEn: 'Verb Tense' },
            toeic_part5_vocab: { labelZh: '情境單字', labelEn: 'Vocabulary' },
            toeic_part5_prep: { labelZh: '介系詞', labelEn: 'Prepositions' },
            toeic_part5_pronouns: { labelZh: '代名詞', labelEn: 'Pronouns' },
            toeic_part5_agreement: { labelZh: '主詞動詞一致', labelEn: 'Agreement' },
        } as Record<ExamQuestionType, QuestionTypeLabelConfig>,
        // TOEIC: same distribution for all levels
        questionTypesByRank: {
            1: [
                { type: 'toeic_part5_pos', percentage: 20 },
                { type: 'toeic_part5_tense', percentage: 20 },
                { type: 'toeic_part5_vocab', percentage: 30 },
                { type: 'toeic_part5_prep', percentage: 10 },
                { type: 'toeic_part5_pronouns', percentage: 10 },
                { type: 'toeic_part5_agreement', percentage: 10 },
            ],
            2: [
                { type: 'toeic_part5_pos', percentage: 20 },
                { type: 'toeic_part5_tense', percentage: 20 },
                { type: 'toeic_part5_vocab', percentage: 30 },
                { type: 'toeic_part5_prep', percentage: 10 },
                { type: 'toeic_part5_pronouns', percentage: 10 },
                { type: 'toeic_part5_agreement', percentage: 10 },
            ],
            3: [
                { type: 'toeic_part5_pos', percentage: 20 },
                { type: 'toeic_part5_tense', percentage: 20 },
                { type: 'toeic_part5_vocab', percentage: 30 },
                { type: 'toeic_part5_prep', percentage: 10 },
                { type: 'toeic_part5_pronouns', percentage: 10 },
                { type: 'toeic_part5_agreement', percentage: 10 },
            ],
            4: [
                { type: 'toeic_part5_pos', percentage: 20 },
                { type: 'toeic_part5_tense', percentage: 20 },
                { type: 'toeic_part5_vocab', percentage: 30 },
                { type: 'toeic_part5_prep', percentage: 10 },
                { type: 'toeic_part5_pronouns', percentage: 10 },
                { type: 'toeic_part5_agreement', percentage: 10 },
            ],
            5: [
                { type: 'toeic_part5_pos', percentage: 20 },
                { type: 'toeic_part5_tense', percentage: 20 },
                { type: 'toeic_part5_vocab', percentage: 30 },
                { type: 'toeic_part5_prep', percentage: 10 },
                { type: 'toeic_part5_pronouns', percentage: 10 },
                { type: 'toeic_part5_agreement', percentage: 10 },
            ],
        },
        topics: {
            1: ['一般商務', '辦公室', '人事管理', '商務旅行', '會議', '電子郵件', '電話溝通', '行程安排', '辦公用品', '公司活動', '新進員工', '職場安全'],
            2: ['一般商務', '辦公室', '人事管理', '商務旅行', '客戶服務', '銷售報告', '培訓課程', '專案進度', '團隊合作', '績效考核', '出差', '視訊會議'],
            3: ['財務預算', '製造業', '企業發展', '行銷', '法律文件', '合約談判', '產品發布', '品質管理', '庫存管理', '供應鏈', '客戶關係', '市場調查'],
            4: ['財務預算', '製造業', '企業發展', '餐飲', '房地產', '投資', '併購', '國際貿易', '法規遵循', '年度報告', '股東會議', '危機處理'],
            5: ['健康', '娛樂', '企業發展', '財務預算', '科技', '環境政策', '全球市場', '高層領導', '策略規劃', '創新', '永續發展', '數位轉型'],
        },
    },
    JP: {
        name: '日本語',
        examName: 'JLPT',
        icon: '🇯🇵',
        color: 'bg-primary/10 border-primary/30 hover:border-primary/50',
        ranks: {
            1: 'N5',
            2: 'N4',
            3: 'N3',
            4: 'N2',
            5: 'N1',
        },
        questionTypes: {
            jlpt_kanji_reading: { labelZh: '漢字讀音', labelEn: 'Kanji Reading' },   // 問題1
            jlpt_kanji_writing: { labelZh: '漢字書寫', labelEn: 'Kanji Writing' },   // 問題2
            jlpt_context_vocab: { labelZh: '文脈規定', labelEn: 'Context Vocab' },   // 問題3
            jlpt_paraphrase: { labelZh: '近義替換', labelEn: 'Paraphrase' },         // 問題4
            jlpt_usage: { labelZh: '用法', labelEn: 'Usage' },                       // 問題5 (N3+)
            jlpt_compound: { labelZh: '複合語', labelEn: 'Compound Words' },         // 問題6 (N2+)
        } as Record<ExamQuestionType, QuestionTypeLabelConfig>,
        questionTypesByRank: {
            // N5: 5 types (no usage - 用法 not in N5)
            1: [
                { type: 'jlpt_kanji_reading', percentage: 22 },
                { type: 'jlpt_kanji_writing', percentage: 22 },
                { type: 'jlpt_context_vocab', percentage: 22 },
                { type: 'jlpt_paraphrase', percentage: 17 },
                { type: 'jlpt_compound', percentage: 17 },
            ],
            // N4: 6 types (all - 用法 starts from N4)
            2: [
                { type: 'jlpt_kanji_reading', percentage: 18 },
                { type: 'jlpt_kanji_writing', percentage: 18 },
                { type: 'jlpt_context_vocab', percentage: 20 },
                { type: 'jlpt_paraphrase', percentage: 15 },
                { type: 'jlpt_usage', percentage: 15 },
                { type: 'jlpt_compound', percentage: 14 },
            ],
            // N3: 6 types (all)
            3: [
                { type: 'jlpt_kanji_reading', percentage: 18 },
                { type: 'jlpt_kanji_writing', percentage: 18 },
                { type: 'jlpt_context_vocab', percentage: 20 },
                { type: 'jlpt_paraphrase', percentage: 15 },
                { type: 'jlpt_usage', percentage: 15 },
                { type: 'jlpt_compound', percentage: 14 },
            ],
            // N2: 6 types (all)
            4: [
                { type: 'jlpt_kanji_reading', percentage: 18 },
                { type: 'jlpt_kanji_writing', percentage: 18 },
                { type: 'jlpt_context_vocab', percentage: 20 },
                { type: 'jlpt_paraphrase', percentage: 15 },
                { type: 'jlpt_usage', percentage: 15 },
                { type: 'jlpt_compound', percentage: 14 },
            ],
            // N1: 4 types (no 表記/kanji_writing, no 語形成/compound)
            5: [
                { type: 'jlpt_kanji_reading', percentage: 25 },
                { type: 'jlpt_context_vocab', percentage: 30 },
                { type: 'jlpt_paraphrase', percentage: 20 },
                { type: 'jlpt_usage', percentage: 25 },
            ],
        },
        topics: {
            1: ['個人資訊', '日常生活', '場所與位置', '基礎描述', '家庭成員', '興趣愛好', '購物', '餐廳', '交通', '天氣', '時間表達', '數字運用'],
            2: ['學校生活', '工作基礎', '旅行', '健康', '電話溝通', '邀約', '請求幫助', '道歉致謝', '購物比較', '天氣預報', '節日活動', '郵局銀行'],
            3: ['職場溝通', '社交活動', '公共服務', '緊急狀況', '新聞報導', '環境議題', '健康管理', '文化體驗', '網路生活', '投訴處理', '租屋搬家', '面試應徵'],
            4: ['商業談判', '社會議題', '抽象概念', '正式場合', '科技趨勢', '教育制度', '法律常識', '經濟新聞', '藝術鑑賞', '歷史文化', '人際關係', '心理健康'],
            5: ['學術研究', '政治外交', '哲學思考', '文學評論', '專業論述', '批判分析', '跨文化溝通', '職場倫理', '環境政策', '醫療科技', '社會福祉', '全球化議題'],
        },
    },
    KR: {
        name: '한국어',
        examName: 'TOPIK',
        icon: '🇰🇷',
        color: 'bg-ink/10 border-ink/30 hover:border-ink/50',
        ranks: {
            1: 'I 1급',
            2: 'I 2급',
            3: 'II 3급',
            4: 'II 4급',
            5: 'II 5급',
            6: 'II 6급',
        },
        questionTypes: {
            topik_vocab_context: { labelZh: '情境詞彙', labelEn: 'Context Vocab' },
            topik_particles: { labelZh: '助詞', labelEn: 'Particles' },
            topik_grammar_blank: { labelZh: '文法填空', labelEn: 'Grammar Blank' },
            topik_synonyms: { labelZh: '近義詞', labelEn: 'Synonyms' },
            topik_grammar_expression: { labelZh: '文法表現', labelEn: 'Grammar Expression' },
            topik_sentence_order: { labelZh: '句子排序', labelEn: 'Sentence Order' },
            topik_content_match: { labelZh: '內容匹配', labelEn: 'Content Match' },
        } as Record<ExamQuestionType, QuestionTypeLabelConfig>,
        questionTypesByRank: {
            // TOPIK I (1-2級) - 情境詞彙/助詞為主
            1: [
                { type: 'topik_vocab_context', percentage: 25 },
                { type: 'topik_particles', percentage: 25 },
                { type: 'topik_synonyms', percentage: 20 },
                { type: 'topik_grammar_blank', percentage: 15 },
                { type: 'topik_sentence_order', percentage: 8 },
                { type: 'topik_content_match', percentage: 7 },
            ],
            2: [
                { type: 'topik_vocab_context', percentage: 25 },
                { type: 'topik_particles', percentage: 25 },
                { type: 'topik_synonyms', percentage: 20 },
                { type: 'topik_grammar_blank', percentage: 15 },
                { type: 'topik_sentence_order', percentage: 8 },
                { type: 'topik_content_match', percentage: 7 },
            ],
            // TOPIK II (3-6級) - 文法填空/文法表現為主
            3: [
                { type: 'topik_grammar_blank', percentage: 22 },
                { type: 'topik_grammar_expression', percentage: 22 },
                { type: 'topik_synonyms', percentage: 18 },
                { type: 'topik_vocab_context', percentage: 18 },
                { type: 'topik_sentence_order', percentage: 10 },
                { type: 'topik_content_match', percentage: 10 },
            ],
            4: [
                { type: 'topik_grammar_blank', percentage: 22 },
                { type: 'topik_grammar_expression', percentage: 22 },
                { type: 'topik_synonyms', percentage: 18 },
                { type: 'topik_vocab_context', percentage: 18 },
                { type: 'topik_sentence_order', percentage: 10 },
                { type: 'topik_content_match', percentage: 10 },
            ],
            5: [
                { type: 'topik_grammar_blank', percentage: 25 },
                { type: 'topik_grammar_expression', percentage: 25 },
                { type: 'topik_synonyms', percentage: 15 },
                { type: 'topik_vocab_context', percentage: 15 },
                { type: 'topik_sentence_order', percentage: 10 },
                { type: 'topik_content_match', percentage: 10 },
            ],
            6: [
                { type: 'topik_grammar_blank', percentage: 25 },
                { type: 'topik_grammar_expression', percentage: 25 },
                { type: 'topik_synonyms', percentage: 15 },
                { type: 'topik_vocab_context', percentage: 15 },
                { type: 'topik_sentence_order', percentage: 10 },
                { type: 'topik_content_match', percentage: 10 },
            ],
        },
        topics: {
            1: ['自我介紹', '日常生活', '場所', '季節與天氣', '家族', '飲食', '購物', '交通', '時間', '數字', '顏色', '身體'],
            2: ['自我介紹', '日常生活', '場所', '季節與天氣', '學校', '興趣', '旅行計畫', '約會', '電話對話', '郵局', '銀行', '醫院'],
            3: ['公共設施利用', '健康與生活', '職場生活', '文化差異', '新聞', '網路', '環境', '搬家', '結婚', '求職', '料理', '運動'],
            4: ['公共設施利用', '健康與生活', '職場生活', '文化差異', '教育制度', '經濟新聞', '社會問題', '藝術', '歷史', '政治', '法律', '科技'],
            5: ['社會現象', '人文科學', '科學與環境', '經濟與政治', '哲學思想', '文學批評', '國際關係', '環境政策', '教育改革', '醫療倫理', '人權', '全球化'],
            6: ['社會現象', '人文科學', '科學與環境', '經濟與政治', '學術論文', '專業研究', '批判思考', '文化分析', '社會福祉', '永續發展', '科技倫理', '未來趨勢'],
        },
    },
    CN: {
        name: '中文',
        examName: 'HSK',
        icon: '🇨🇳',
        color: 'bg-primary/10 border-primary/30 hover:border-primary/50',
        ranks: {
            1: '1級',
            2: '2級',
            3: '3級',
            4: '4級',
            5: '5級',
            6: '6級',
        },
        questionTypes: {
            hsk_vocab_blank: { labelZh: '選詞填空', labelEn: 'Vocab Fill-in' },
            hsk_grammar_blank: { labelZh: '語法填空', labelEn: 'Grammar Fill-in' },
            hsk_synonyms: { labelZh: '近義詞', labelEn: 'Synonyms' },
            hsk_sentence_order: { labelZh: '句子排序', labelEn: 'Sentence Order' },
            hsk_measure_words: { labelZh: '量詞', labelEn: 'Measure Words' },
            hsk_word_order: { labelZh: '語序', labelEn: 'Word Order' },
        } as Record<ExamQuestionType, QuestionTypeLabelConfig>,
        questionTypesByRank: {
            // HSK 1: 入門 - 量詞多
            1: [
                { type: 'hsk_vocab_blank', percentage: 30 },
                { type: 'hsk_grammar_blank', percentage: 15 },
                { type: 'hsk_synonyms', percentage: 15 },
                { type: 'hsk_sentence_order', percentage: 10 },
                { type: 'hsk_measure_words', percentage: 20 },
                { type: 'hsk_word_order', percentage: 10 },
            ],
            // HSK 2: 基礎
            2: [
                { type: 'hsk_vocab_blank', percentage: 28 },
                { type: 'hsk_grammar_blank', percentage: 18 },
                { type: 'hsk_synonyms', percentage: 17 },
                { type: 'hsk_sentence_order', percentage: 12 },
                { type: 'hsk_measure_words', percentage: 15 },
                { type: 'hsk_word_order', percentage: 10 },
            ],
            // HSK 3: 初中級
            3: [
                { type: 'hsk_vocab_blank', percentage: 25 },
                { type: 'hsk_grammar_blank', percentage: 22 },
                { type: 'hsk_synonyms', percentage: 20 },
                { type: 'hsk_sentence_order', percentage: 15 },
                { type: 'hsk_measure_words', percentage: 10 },
                { type: 'hsk_word_order', percentage: 8 },
            ],
            // HSK 4: 中級 - 量詞少
            4: [
                { type: 'hsk_vocab_blank', percentage: 22 },
                { type: 'hsk_grammar_blank', percentage: 25 },
                { type: 'hsk_synonyms', percentage: 22 },
                { type: 'hsk_sentence_order', percentage: 18 },
                { type: 'hsk_measure_words', percentage: 5 },
                { type: 'hsk_word_order', percentage: 8 },
            ],
            // HSK 5: 中高級 - 無量詞
            5: [
                { type: 'hsk_vocab_blank', percentage: 20 },
                { type: 'hsk_grammar_blank', percentage: 28 },
                { type: 'hsk_synonyms', percentage: 25 },
                { type: 'hsk_sentence_order', percentage: 17 },
                { type: 'hsk_word_order', percentage: 10 },
            ],
            // HSK 6: 高級 - 無量詞
            6: [
                { type: 'hsk_vocab_blank', percentage: 18 },
                { type: 'hsk_grammar_blank', percentage: 30 },
                { type: 'hsk_synonyms', percentage: 25 },
                { type: 'hsk_sentence_order', percentage: 17 },
                { type: 'hsk_word_order', percentage: 10 },
            ],
        },
        topics: {
            1: ['個人資訊', '數字與時間', '基本動作', '簡單位置', '家庭', '食物', '顏色', '動物', '天氣', '身體部位', '問候', '物品'],
            2: ['個人資訊', '數字與時間', '基本動作', '簡單位置', '學校', '工作', '購物', '餐廳', '交通', '天氣預報', '節日', '運動'],
            3: ['旅行交通', '購物消費', '學校生活', '職場基礎', '健康', '環境', '電話', '郵件', '租房', '銀行', '醫院', '網路'],
            4: ['旅行交通', '購物消費', '學校生活', '職場基礎', '健康', '新聞', '文化', '科技', '教育', '經濟', '藝術', '歷史'],
            5: ['文化與習俗', '社會話題', '情感與觀點', '文學與歷史', '哲學', '政治', '法律', '環保', '科學', '心理', '倫理', '國際'],
            6: ['文化與習俗', '社會話題', '情感與觀點', '文學與歷史', '學術研究', '專業論述', '批判分析', '多元文化', '社會福祉', '永續發展', '媒體素養', '全球視野'],
        },
    },
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/** Get language config */
export function getLanguageConfig(lang: TargetLanguage): LanguageConfig {
    return languageConfig[lang]
}

/** Get question types available for a specific rank (with percentages) */
export function getQuestionTypesForRank(lang: TargetLanguage, rank: number): RankQuestionTypeConfig[] {
    return languageConfig[lang]?.questionTypesByRank[rank] || []
}

/** Get question type values available for a specific rank */
export function getQuestionTypeValuesForRank(lang: TargetLanguage, rank: number): ExamQuestionType[] {
    return getQuestionTypesForRank(lang, rank).map(t => t.type)
}

/** Get all question types for a language (all types across all ranks) */
export function getAllQuestionTypes(lang: TargetLanguage): ExamQuestionType[] {
    const config = languageConfig[lang]
    if (!config) return []
    return Object.keys(config.questionTypes) as ExamQuestionType[]
}

/** Get label for a question type */
export function getQuestionTypeLabel(type: ExamQuestionType | string, useEnglish = false): string {
    for (const config of Object.values(languageConfig)) {
        const labelConfig = config.questionTypes[type as ExamQuestionType]
        if (labelConfig) {
            return useEnglish ? labelConfig.labelEn : labelConfig.labelZh
        }
    }
    return type
}

/** Get label config for a question type */
export function getQuestionTypeLabelConfig(lang: TargetLanguage, type: ExamQuestionType): QuestionTypeLabelConfig | undefined {
    return languageConfig[lang]?.questionTypes[type]
}

/** Get percentage map for a specific rank */
export function getPercentageMapForRank(lang: TargetLanguage, rank: number): Record<ExamQuestionType, number> {
    const types = getQuestionTypesForRank(lang, rank)
    return Object.fromEntries(types.map(t => [t.type, t.percentage])) as Record<ExamQuestionType, number>
}

/** Get topics for a language and rank */
export function getTopics(lang: TargetLanguage, rank: number): string[] {
    return languageConfig[lang]?.topics[rank] || ['General']
}

/** Get a random topic */
export function getRandomTopic(lang: TargetLanguage, rank: number): string {
    const topics = getTopics(lang, rank)
    return topics[Math.floor(Math.random() * topics.length)]
}

/** Get rank label */
export function getRankLabel(lang: TargetLanguage, rank: number): string {
    return languageConfig[lang]?.ranks[rank] || `Level ${rank}`
}

/** Check if a question type is available for a specific rank */
export function isQuestionTypeAvailableForRank(lang: TargetLanguage, type: ExamQuestionType, rank: number): boolean {
    const types = getQuestionTypesForRank(lang, rank)
    return types.some(t => t.type === type)
}

