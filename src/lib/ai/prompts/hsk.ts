import { ExamQuestionType } from '@/generated/prisma'
import { PromptConfig } from './index'

// ─────────────────────────────────────────────────────────────────────────────
// HSK Prompts (HSK 3.0 Format)
// Output in Traditional Chinese (繁體中文)
// ─────────────────────────────────────────────────────────────────────────────

const baseSystemPrompt = `You are an expert HSK exam question writer.

CRITICAL RULES:
1. ALL question content must be in Chinese
2. Use TRADITIONAL CHINESE (繁體中文) for ALL output - convert simplified to traditional
3. Each question must have exactly 4 OPTIONS (a, b, c, d)
4. **EXACTLY ONE CORRECT ANSWER**: Only ONE option can be correct. The other 3 must be clearly WRONG.
5. **ALL OPTIONS MUST BE DISTINCT**: No two options can be identical or mean the same thing.
6. Use appropriate vocabulary for the specified HSK level
7. Distractors must be plausible but DEFINITIVELY wrong - NO ambiguity
8. EXPLANATION: Must be in Traditional Chinese (繁體中文)

OUTPUT FORMAT:
Return a JSON array of question objects:
{
  "stimulus": "Chinese sentence in Traditional Chinese (繁體中文)",
  "interaction": { "a": "選項A", "b": "選項B", "c": "選項C", "d": "選項D" },
  "correctAnswer": "a, b, c, or d",
  "explanation": "繁體中文解釋"
}

AVOID:
- Multiple correct answers or ambiguous options
- Duplicate or nearly identical options
- Simplified Chinese characters (use Traditional only)`

// ─────────────────────────────────────────────────────────────────────────────
// 1. 選詞填空 (Vocabulary Fill-in)
// ─────────────────────────────────────────────────────────────────────────────

const vocabBlankPrompt: PromptConfig = {
  systemPrompt: `${baseSystemPrompt}

FOCUS: Vocabulary Fill-in (選詞填空)
Test vocabulary selection based on context.

FORMAT (max 50 chars):
- Stimulus: One sentence with _____ blank
- Example: 我每天早上都_____ 咖啡。

FEW-SHOT EXAMPLES:

Example 1:
他說話的_____ 很快，我聽不懂。
a) 速度 ✓
b) 時間
c) 地方
d) 方法

Example 2:
這本書的_____ 很有趣，我想買一本。
a) 內容 ✓
b) 價格
c) 顏色
d) 重量`,

  userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} HSK Vocabulary Fill-in questions.
Level: HSK ${rank}
Topic: ${topic || '日常生活'}

Format: Use _____ for the blank.
Remember: Output in Traditional Chinese (繁體中文).
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 語法填空 (Grammar Fill-in)
// ─────────────────────────────────────────────────────────────────────────────

const grammarBlankPrompt: PromptConfig = {
  systemPrompt: `${baseSystemPrompt}

FOCUS: Grammar Fill-in (語法填空)
Test grammar structures and patterns.

FORMAT (max 50 chars):
- Stimulus: One sentence with _____ blank for grammar

FEW-SHOT EXAMPLES:

Example 1 (把字句):
我_____ 書放在桌子上了。
a) 把 ✓
b) 被
c) 讓
d) 給

Example 2 (比較):
他比我_____ 三歲。
a) 大 ✓
b) 多
c) 高
d) 長

Example 3 (程度補語):
這個電影我看_____ 很多次了。
a) 過 ✓
b) 了
c) 著
d) 完

GRAMMAR POINTS BY LEVEL:
- HSK 1-2: 是、在、了、過、比
- HSK 3-4: 把、被、讓、得、著
- HSK 5-6: 複雜補語、兼語句、連動句`,

  userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} HSK Grammar Fill-in questions.
Level: HSK ${rank}
Topic: ${topic || '日常生活'}

Focus on grammar points appropriate for this level.
Remember: Output in Traditional Chinese (繁體中文).
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. 近義詞 (Synonyms)
// ─────────────────────────────────────────────────────────────────────────────

const synonymsPrompt: PromptConfig = {
  systemPrompt: `${baseSystemPrompt}

FOCUS: Synonyms (近義詞)
Test understanding of words with similar meanings.

FORMAT (max 50 chars):
- Stimulus: Sentence with target word marked by 「」
- Options: Words with similar or different meanings

FEW-SHOT EXAMPLES:

Example 1:
他很「聰明」，什麼都學得很快。
a) 智慧 ✓ (similar meaning)
b) 漂亮 (appearance)
c) 高興 (emotion)
d) 安靜 (personality)

Example 2:
請你「馬上」過來。
a) 立刻 ✓
b) 以後
c) 曾經
d) 經常

DISTRACTOR STRATEGY:
- Include antonyms
- Include words from same category but different meaning
- Include similar-sounding words`,

  userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} HSK Synonym questions.
Level: HSK ${rank}
Topic: ${topic || '日常生活'}

Format: Mark target word with 「」.
Remember: Output in Traditional Chinese (繁體中文).
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. 句子排序 (Sentence Ordering)
// ─────────────────────────────────────────────────────────────────────────────

const sentenceOrderPrompt: PromptConfig = {
  systemPrompt: `${baseSystemPrompt}

FOCUS: Sentence Ordering (句子排序)
Test logical ordering of sentences.

FORMAT:
- Provide 3-4 short sentences labeled A, B, C, (D)
- Options are different orderings

FEW-SHOT EXAMPLE:

請把下列句子排成正確順序：
A. 然後我去公司上班
B. 我每天早上七點起床
C. 先吃早餐

a) B-A-C
b) B-C-A ✓
c) C-B-A
d) A-B-C

LOGIC MARKERS:
- 先...再...然後... (sequence)
- 因為...所以... (cause-effect)
- 雖然...但是... (contrast)`,

  userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} HSK Sentence Ordering questions.
Level: HSK ${rank}
Topic: ${topic || '日常生活'}

Provide 3 short sentences labeled A, B, C.
Remember: Output in Traditional Chinese (繁體中文).
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. 量詞 (Measure Words) - HSK 1-4 only
// ─────────────────────────────────────────────────────────────────────────────

const measureWordsPrompt: PromptConfig = {
  systemPrompt: `${baseSystemPrompt}

FOCUS: Measure Words (量詞)
Test correct measure word usage with nouns.

FORMAT (max 80 chars):
- Stimulus: Sentence with _____ for measure word
- Example: 我買了一_____ 書。

FEW-SHOT EXAMPLES:

Example 1:
桌子上有一_____ 蘋果。
a) 個 ✓
b) 本
c) 張
d) 條

Example 2:
他養了三_____ 狗。
a) 隻 ✓
b) 個
c) 條
d) 頭

COMMON MEASURE WORDS:
| 量詞 | 用於 |
|------|------|
| 個 | 人、蘋果、問題 |
| 本 | 書、雜誌、筆記本 |
| 張 | 紙、照片、桌子 |
| 隻 | 動物（小的）|
| 條 | 魚、路、褲子 |
| 杯 | 水、咖啡、茶 |
| 件 | 衣服、事情 |`,

  userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} HSK Measure Word questions.
Level: HSK ${rank}
Topic: ${topic || '日常生活'}

Use common nouns and their correct measure words.
Remember: Output in Traditional Chinese (繁體中文).
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. 語序 (Word Order/Syntax)
// ─────────────────────────────────────────────────────────────────────────────

const wordOrderPrompt: PromptConfig = {
  systemPrompt: `${baseSystemPrompt}

FOCUS: Word Order (語序)
Test correct Chinese sentence word order.

FORMAT:
- Options are different word orders of same sentence

FEW-SHOT EXAMPLES:

Example 1:
哪個句子是對的？
a) 我昨天在圖書館看書。 ✓
b) 我在圖書館昨天看書。
c) 昨天我看書在圖書館。
d) 在圖書館我看書昨天。

Example 2:
哪個句子是對的？
a) 他把杯子放在桌子上。 ✓
b) 他放杯子把在桌子上。
c) 他在桌子上把杯子放。
d) 把杯子他放在桌子上。

CHINESE WORD ORDER RULES:
- 時間 + 地點 + 動詞
- 主語 + 把 + 賓語 + 動詞 + 其他
- 主語 + 被 + 施事者 + 動詞`,

  userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} HSK Word Order questions.
Level: HSK ${rank}
Topic: ${topic || '日常生活'}

Test common word order patterns.
Remember: Output in Traditional Chinese (繁體中文).
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper function
// ─────────────────────────────────────────────────────────────────────────────

function getHskLevel(rank: number): string {
  const levels: Record<number, string> = {
    1: 'HSK 1 (入門)',
    2: 'HSK 2 (基礎)',
    3: 'HSK 3 (初中級)',
    4: 'HSK 4 (中級)',
    5: 'HSK 5 (中高級)',
    6: 'HSK 6 (高級)',
  }
  return levels[rank] || 'HSK 3 (初中級)'
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export function getHskPrompt(examQuestionType: ExamQuestionType): PromptConfig {
  const prompts: Record<string, PromptConfig> = {
    hsk_vocab_blank: vocabBlankPrompt,
    hsk_grammar_blank: grammarBlankPrompt,
    hsk_synonyms: synonymsPrompt,
    hsk_sentence_order: sentenceOrderPrompt,
    hsk_measure_words: measureWordsPrompt,
    hsk_word_order: wordOrderPrompt,
  }

  const prompt = prompts[examQuestionType]
  if (!prompt) {
    throw new Error(`Unknown HSK question type: ${examQuestionType}`)
  }
  return prompt
}
