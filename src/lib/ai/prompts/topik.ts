import { ExamQuestionType } from '@/generated/prisma'
import { PromptConfig } from './index'

// ─────────────────────────────────────────────────────────────────────────────
// TOPIK 讀解 Prompts
// Based on official TOPIK exam format (제96회)
// TOPIK I (1-2급): vocab_context, particles, synonyms, sentence_order, content_match
// TOPIK II (3-6급): grammar_blank, grammar_expression, synonyms, sentence_order, content_match
// ─────────────────────────────────────────────────────────────────────────────

const baseSystemPrompt = `You are an expert TOPIK exam question writer.

CRITICAL RULES:
1. ALL content must be in Korean only (T2T Mode)
2. Each question must have exactly 4 OPTIONS (a, b, c, d)
3. **EXACTLY ONE CORRECT ANSWER**: Only ONE option can be correct. The other 3 must be clearly WRONG.
4. **ALL OPTIONS MUST BE DISTINCT**: No two options can be identical or mean the same thing.
5. Use appropriate vocabulary for the specified level
6. Distractors must be plausible but DEFINITIVELY wrong - NO ambiguity
7. EXPLANATION: Must be in Traditional Chinese (繁體中文)

OUTPUT FORMAT:
Return a JSON array of question objects:
{
  "stimulus": "Korean sentence/text",
  "interaction": { "a": "...", "b": "...", "c": "...", "d": "..." },
  "correctAnswer": "a, b, c, or d",
  "explanation": "繁體中文解釋"
}

AVOID:
- Multiple correct answers or ambiguous options
- Duplicate or nearly identical options`

// ─────────────────────────────────────────────────────────────────────────────
// 1. 情境詞彙 (Context Vocabulary) - TOPIK I Main
// ─────────────────────────────────────────────────────────────────────────────

const vocabContextPrompt: PromptConfig = {
    systemPrompt: `${baseSystemPrompt}

FOCUS: Context Vocabulary (情境詞彙)
Test vocabulary selection based on context.

FORMAT (max 80 chars):
- Stimulus: One sentence with _____ blank
- Example: _____에 갑니다. 책을 삽니다.
- Answer: 서점 (bookstore)

DISTRACTOR STRATEGY:
- Same category but wrong context (은행, 식당, 극장)
- Similar function but different location`,

    userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} TOPIK Context Vocabulary questions.
Level: TOPIK ${getTopikLevel(rank)}
Topic: ${topic || '일상생활'}

Format: _____에 갑니다. 책을 삽니다.
Options should be places/verbs/adjectives that fit similar contexts.
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 助詞 (Particles) - TOPIK I
// ─────────────────────────────────────────────────────────────────────────────

const particlesPrompt: PromptConfig = {
    systemPrompt: `${baseSystemPrompt}

FOCUS: Particles (助詞)
Test correct Korean particle usage.

FORMAT (max 30 chars):
- Stimulus: One sentence with _____ for particle
- Example: 저는 서울 _____ 살아요.

PARTICLE PAIRS (include batchim variations):
| Particle | Function |
|----------|----------|
| 을/를 | Object |
| 이/가 | Subject |
| 은/는 | Topic |
| 에/에서 | Location |
| 으로/로 | Direction/Means |
| 의 | Possession |`,

    userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} TOPIK Particle questions.
Level: TOPIK ${getTopikLevel(rank)}
Topic: ${topic || '일상생활'}

Format: 저는 서울( ) 살아요.
Include particles with batchim variations.
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. 文法填空 (Grammar Fill-in) - TOPIK II Q1-2
// ─────────────────────────────────────────────────────────────────────────────

const grammarBlankPrompt: PromptConfig = {
    systemPrompt: `${baseSystemPrompt}

FOCUS: Grammar Fill-in (文法填空) - _____에 들어갈 말
Test sentence connectors and verb endings.

FORMAT (max 50 chars):
- Stimulus: One sentence with _____ for grammar
- Example: 감기약을 _____ 열이 내렸다.

GRAMMAR PATTERNS:
| Pattern | Meaning |
|---------|---------|
| -고 나서 | After doing |
| -(으)니까 | Because (reason) |
| -아/어서 | Because (cause) |
| -(으)면 | If/When |
| -(으)지만 | But/Although |
| -(으)ㄹ 텐데 | Would probably |
| -더라도 | Even if |`,

    userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} TOPIK Grammar fill-in questions.
Level: TOPIK ${getTopikLevel(rank)}
Topic: ${topic || '일상생활'}

Format: 감기약을 ( ) 열이 내렸다.
Focus on intermediate-advanced grammar patterns.
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. 近義詞 (Synonyms) - Both levels
// ─────────────────────────────────────────────────────────────────────────────

const synonymsPrompt: PromptConfig = {
    systemPrompt: `${baseSystemPrompt}

FOCUS: Synonyms (近義詞)
Test vocabulary by finding words with similar meaning.

FORMAT (max 80 chars):
- Stimulus: Sentence with target word marked by 「」
- Example: 이 음식은 정말 「맛있어요」.

DISTRACTOR STRATEGY:
- Same semantic field but different meaning
- Antonyms (opposite meaning)
- Similar sound but different meaning`,

    userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} TOPIK Synonym questions.
Level: TOPIK ${getTopikLevel(rank)}
Topic: ${topic || '일상생활'}

Format: Use 「」 to mark the target word.
Example: 오늘 날씨가 「좋아요」.
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. 文法表現近義詞 (Grammar Expression Synonyms) - TOPIK II Q3-4
// ─────────────────────────────────────────────────────────────────────────────

const grammarExpressionPrompt: PromptConfig = {
    systemPrompt: `${baseSystemPrompt}

FOCUS: Grammar Expression Synonyms (文法表現近義詞)
Test understanding of grammar expressions with similar meanings.

FORMAT (max 50 chars):
- Underlined grammar expression to find synonym
- Example: 버스를 잘못 「타는 바람에」 수업에 늦었다.

GRAMMAR EXPRESSION PAIRS:
| Expression | Similar |
|------------|---------|
| -는 바람에 | -아/어서 (cause) |
| -아/어야만 하다 | -ㄹ 수밖에 없다 (must) |
| -는 덕분에 | -아/어서 (positive cause) |
| -는 대신에 | -지 않고 (instead) |`,

    userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} TOPIK Grammar Expression Synonym questions.
Level: TOPIK ${getTopikLevel(rank)}
Topic: ${topic || '일상생활'}

Format: 밑줄 친 부분과 의미가 가장 비슷한 것
Mark the grammar expression with 「」.
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. 句子排序 (Sentence Ordering) - Both levels
// ─────────────────────────────────────────────────────────────────────────────

const sentenceOrderPrompt: PromptConfig = {
    systemPrompt: `${baseSystemPrompt}

FOCUS: Sentence Ordering (句子排序)
Test logical ordering of sentences.

FORMAT (3 sentences, ~90 chars total):
- Provide 3 short sentences labeled (가), (나), (다)
- Options are different orderings

EXAMPLE:
(가) 그래서 오늘 병원에 갔습니다.
(나) 어제부터 머리가 아팠습니다.
(다) 의사가 약을 줬습니다.

Options:
a) (가)-(나)-(다)
b) (나)-(가)-(다) ✓
c) (다)-(가)-(나)
d) (나)-(다)-(가)`,

    userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} TOPIK Sentence Ordering questions.
Level: TOPIK ${getTopikLevel(rank)}
Topic: ${topic || '일상생활'}

Provide 3 short sentences (가), (나), (다) and ordering options.
Each sentence should be simple and clear.
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. 內容匹配 (Content Matching) - Both levels
// ─────────────────────────────────────────────────────────────────────────────

const contentMatchPrompt: PromptConfig = {
    systemPrompt: `${baseSystemPrompt}

FOCUS: Content Matching (內容匹配)
Test reading comprehension with short text.

FORMAT (2-3 sentences, ~80 chars):
- Short passage describing a situation
- Options are statements, only one matches

EXAMPLE:
저는 매일 아침 7시에 일어납니다. 커피를 마시고 회사에 갑니다.

Options:
a) 저는 아침에 차를 마십니다.
b) 저는 매일 아침 커피를 마십니다. ✓
c) 저는 저녁에 회사에 갑니다.
d) 저는 늦게 일어납니다.`,

    userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} TOPIK Content Matching questions.
Level: TOPIK ${getTopikLevel(rank)}
Topic: ${topic || '일상생활'}

Write a 2-3 sentence passage and 4 statement options.
Only one option should match the content exactly.
`,
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper function
// ─────────────────────────────────────────────────────────────────────────────

function getTopikLevel(rank: number): string {
    const levels: Record<number, string> = {
        1: 'I-1급 (入門)',
        2: 'I-2급 (初級)',
        3: 'II-3급 (中級)',
        4: 'II-4급 (中高級)',
        5: 'II-5급 (高級)',
        6: 'II-6급 (精通)',
    }
    return levels[rank] || 'II-3급 (中級)'
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export function getTopikPrompt(examQuestionType: ExamQuestionType): PromptConfig {
    const prompts: Record<string, PromptConfig> = {
        topik_vocab_context: vocabContextPrompt,
        topik_particles: particlesPrompt,
        topik_grammar_blank: grammarBlankPrompt,
        topik_synonyms: synonymsPrompt,
        topik_grammar_expression: grammarExpressionPrompt,
        topik_sentence_order: sentenceOrderPrompt,
        topik_content_match: contentMatchPrompt,
    }

    const prompt = prompts[examQuestionType]
    if (!prompt) {
        throw new Error(`Unknown TOPIK question type: ${examQuestionType}`)
    }
    return prompt
}
