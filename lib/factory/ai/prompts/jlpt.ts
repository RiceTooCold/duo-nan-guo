import { ExamQuestionType } from '@prisma/client'
import { PromptConfig } from './index'

// ─────────────────────────────────────────────────────────────────────────────
// JLPT 言語知識（文字・語彙）Prompts
// Based on official JLPT exam format analysis
// ─────────────────────────────────────────────────────────────────────────────

const baseSystemPrompt = `You are an expert JLPT exam question writer.

CRITICAL RULES:
1. ALL question content must be in Japanese only (T2T Mode)
2. Each question must have exactly 4 OPTIONS (a, b, c, d)
3. **EXACTLY ONE CORRECT ANSWER**: Only ONE option can be correct. The other 3 must be clearly WRONG.
4. **ALL OPTIONS MUST BE DISTINCT**: No two options can be identical or mean the same thing.
5. Use appropriate kanji/hiragana/katakana for the specified level
6. Distractors must be plausible but DEFINITIVELY wrong - there should be NO ambiguity
7. STIMULUS LENGTH: Keep to ONE SENTENCE (40-80 characters for fill-in types, up to 150 for usage/paraphrase).
8. EXPLANATION: Must be in Traditional Chinese (繁體中文)

OUTPUT FORMAT:
Return a JSON array of question objects:
{
  "stimulus": "Japanese sentence (max 80 chars)",
  "interaction": {
    "a": "選択肢A",
    "b": "選択肢B", 
    "c": "選択肢C",
    "d": "選択肢D"
  },
  "correctAnswer": "a, b, c, or d",
  "explanation": "繁體中文解釋"
}

AVOID:
- Multiple correct answers or ambiguous options
- Duplicate or nearly identical options
- Sentences over 50 characters
- 3 obvious wrong options + 1 correct (all should be plausible)
- Vocabulary beyond the specified level
- Unnatural Japanese expressions`

// ─────────────────────────────────────────────────────────────────────────────
// 問題1：漢字読み（全級別）
// ─────────────────────────────────────────────────────────────────────────────

const kanjiReadingPrompt: PromptConfig = {
  systemPrompt: `${baseSystemPrompt}

FOCUS: 漢字読み（Kanji Reading）
Test the correct reading of kanji compound words.

FORMAT:
- Sentence contains target kanji marked with「」brackets
- Example: 彼は「学生」です。
- All 4 options must be in hiragana

DISTRACTOR STRATEGY:
- 長音混淆: 空港 → くうこう vs こうこう
- 促音混淆: 学校 → がっこう vs がくこう  
- 清濁音混淆: 火事 → かじ vs がじ
- 音読み/訓読み混淆: 人 → じん/にん vs ひと

FEW-SHOT EXAMPLE:
{
  "stimulus": "あしたは「天気」がいいそうです。",
  "interaction": {
    "a": "てんき",
    "b": "でんき",
    "c": "てんぎ",
    "d": "でんぎ"
  },
  "correctAnswer": "a",
  "explanation": "「天気」的正確讀音是「てんき」。「電気」讀作「でんき」，注意區分天/電的差異。"
}`,

  userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} JLPT Kanji Reading questions.
Level: JLPT ${getJlptLevel(rank)}
Topic: ${topic || '日常生活'}

Requirements:
- Mark target kanji with「」brackets
- Sentence under 30 characters
- All 4 options in hiragana only
- Use level-appropriate kanji vocabulary
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// 問題2：漢字書寫（全級別）
// ─────────────────────────────────────────────────────────────────────────────

const kanjiWritingPrompt: PromptConfig = {
  systemPrompt: `${baseSystemPrompt}

FOCUS: 漢字書き（Kanji Writing / Orthography）
Test writing the correct kanji for a hiragana word.

FORMAT:
- Sentence contains target word in「ひらがな」brackets
- Example: わたしは毎日「さんぽ」します。
- All 4 options must be kanji compounds

DISTRACTOR STRATEGY:
- 同音異字: 議論 vs 義論 vs 疑論
- 形似漢字: 散歩 vs 参歩
- 常見誤寫: 電話 vs 伝話

FEW-SHOT EXAMPLE:
{
  "stimulus": "わたしは毎日「さんぽ」します。",
  "interaction": {
    "a": "散歩",
    "b": "参歩",
    "c": "産歩",
    "d": "三歩"
  },
  "correctAnswer": "a",
  "explanation": "「さんぽ」的正確漢字是「散歩」。「散」表示散開，「歩」表示步行。"
}`,

  userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} JLPT Kanji Writing questions.
Level: JLPT ${getJlptLevel(rank)}
Topic: ${topic || '日常生活'}

Requirements:
- Mark target hiragana word with「」brackets
- Sentence under 30 characters
- All 4 options must be kanji (no hiragana options)
- Include homophone kanji traps
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// 問題3：文脈規定（全級別）
// ─────────────────────────────────────────────────────────────────────────────

const contextVocabPrompt: PromptConfig = {
  systemPrompt: `${baseSystemPrompt}

FOCUS: 文脈規定（Context-based Vocabulary）
Test selecting the most appropriate word based on context.

FORMAT:
- Sentence with blank: ＿＿＿ or _____
- Example: きのうは＿＿＿ねましたから、今日は眠いです。
- All 4 options should be same word class (all verbs, all adverbs, etc.)

DISTRACTOR STRATEGY:
- Same word class, different meaning: 値段/金額/価値/費用
- Similar meaning, wrong collocation: 値段が安い ✓ vs 価値が安い ✗
- Semantic field confusion

FEW-SHOT EXAMPLE:
{
  "stimulus": "この店は＿＿＿が安いので、客が多い。",
  "interaction": {
    "a": "値段",
    "b": "金額",
    "c": "価値",
    "d": "費用"
  },
  "correctAnswer": "a",
  "explanation": "「値段が安い」是固定搭配。「価値」通常用「高い/低い」，「費用」用「かかる」。"
}`,

  userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} JLPT Context Vocabulary questions.
Level: JLPT ${getJlptLevel(rank)}
Topic: ${topic || '日常生活'}

Requirements:
- Use ＿＿＿ or _____ for blanks
- All 4 options must be same word class
- Focus on collocations and fixed expressions
- Test natural Japanese word choice
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// 問題4：言い換え/近義替換（全級別）
// ─────────────────────────────────────────────────────────────────────────────

const paraphrasePrompt: PromptConfig = {
  systemPrompt: `${baseSystemPrompt}

FOCUS: 言い換え類義（Paraphrase / Synonym）
Test selecting a word/phrase with similar meaning to the underlined word.

FORMAT:
- Sentence with target word marked with「」or underline
- Ask for synonym or equivalent expression
- Example: この店はとても「にぎやか」です。

DISTRACTOR STRATEGY:
- Antonym traps: にぎやか ↔ しずか
- Similar sound, different meaning
- Same semantic field, wrong nuance

FEW-SHOT EXAMPLE:
{
  "stimulus": "彼は「しきりに」時計を見ていた。",
  "interaction": {
    "a": "何度も",
    "b": "ときどき",
    "c": "ゆっくり",
    "d": "いつも"
  },
  "correctAnswer": "a",
  "explanation": "「しきりに」意為頻繁地、不斷地，與「何度も」（多次）意義相近。「ときどき」是偶爾，程度不同。"
}`,

  userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} JLPT Paraphrase questions.
Level: JLPT ${getJlptLevel(rank)}
Topic: ${topic || '抽象概念'}

Requirements:
- Mark target word with「」brackets
- Test synonym recognition
- Include antonyms as trap options
- For N2/N1, include subtle nuance differences
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// 問題5：用法（N3-N1 only）
// ─────────────────────────────────────────────────────────────────────────────

const usagePrompt: PromptConfig = {
  systemPrompt: `${baseSystemPrompt}

FOCUS: 用法（Word Usage）
Test identifying the correct usage of a word in context.
NOTE: This question type is for N3, N2, N1 only.

FORMAT:
- Give a target word
- Provide 4 example sentences using that word
- Only ONE sentence uses the word correctly

DISTRACTOR STRATEGY:
- Wrong grammatical connection
- Wrong semantic fit (subject doesn't match verb properties)
- Wrong register or formality

FEW-SHOT EXAMPLE:
{
  "stimulus": "「つもり」の使い方で正しいものはどれですか。",
  "interaction": {
    "a": "明日から毎日運動するつもりです。",
    "b": "電車が遅れるつもりだ。",
    "c": "昨日雨が降ったつもりです。",
    "d": "この本は面白いつもりです。"
  },
  "correctAnswer": "a",
  "explanation": "「つもり」表示說話者的意圖或打算，只能用於有意志的主語。選項B/C/D的主語（電車、雨、本）沒有意志，用法錯誤。"
}`,

  userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} JLPT Word Usage questions.
Level: JLPT ${getJlptLevel(rank)}
Topic: ${topic || '抽象概念'}

Requirements:
- Give target word in stimulus with「」brackets
- 4 example sentences, only 1 correct usage
- Include grammatical and semantic usage errors
- Focus on common misuse patterns
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// 問題6：複合語組成（N2-N1 only）
// ─────────────────────────────────────────────────────────────────────────────

const compoundWordPrompt: PromptConfig = {
  systemPrompt: `${baseSystemPrompt}

FOCUS: 複合語形成（Compound Word Formation）
Test identifying common elements in compound words.
NOTE: This question type is for N2, N1 only.

FORMAT:
- Give 2-3 incomplete compound words with blank
- Find the common element that fits all blanks
- Example: （＿＿止め）（＿＿切る）（＿＿詰め）→ 言い

DISTRACTOR STRATEGY:
- Similar readings that don't form valid compounds
- Real words that only fit one pattern

FEW-SHOT EXAMPLE:
{
  "stimulus": "（＿＿込む）（＿＿出す）（＿＿上げる）",
  "interaction": {
    "a": "飛び",
    "b": "押し",
    "c": "引き",
    "d": "打ち"
  },
  "correctAnswer": "a",
  "explanation": "「飛び」可組成「飛び込む」（跳入）、「飛び出す」（跳出）、「飛び上げる」（跳起）。都是與「飛ぶ」相關的複合動詞。"
}`,

  userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} JLPT Compound Word questions.
Level: JLPT ${getJlptLevel(rank)}
Topic: ${topic || '動作表現'}

Requirements:
- Give 2-3 incomplete compound patterns
- Common element should form valid compounds with all patterns
- Focus on productive compound verb patterns
- Include common verbs: 込む, 出す, 上げる, 切る, etc.
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function getJlptLevel(rank: number): string {
  const levels: Record<number, string> = {
    1: 'N5（入門｜漢字約100字）',
    2: 'N4（初級｜漢字約300字）',
    3: 'N3（中級｜漢字約650字）',
    4: 'N2（中高級｜漢字約1000字）',
    5: 'N1（高級｜漢字約2000字）',
  }
  return levels[rank] || 'N3（中級）'
}

export function getJlptPrompt(examQuestionType: ExamQuestionType): PromptConfig {
  const prompts: Record<string, PromptConfig> = {
    // 問題1: 漢字読み (all levels)
    jlpt_kanji_reading: kanjiReadingPrompt,
    // 問題2: 漢字書き (all levels)
    jlpt_kanji_writing: kanjiWritingPrompt,
    // 問題3: 文脈規定 (all levels)
    jlpt_context_vocab: contextVocabPrompt,
    // 問題4: 言い換え (all levels)
    jlpt_paraphrase: paraphrasePrompt,
    // 問題5: 用法 (N3-N1 only)
    jlpt_usage: usagePrompt,
    // 問題6: 複合語 (N2-N1 only)
    jlpt_compound: compoundWordPrompt,
  }

  const prompt = prompts[examQuestionType]
  if (!prompt) {
    throw new Error(`Unknown JLPT question type: ${examQuestionType}`)
  }
  return prompt
}
