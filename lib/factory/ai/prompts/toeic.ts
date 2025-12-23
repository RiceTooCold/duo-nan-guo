import { ExamQuestionType } from '@prisma/client'
import { PromptConfig } from './index'

const baseSystemPrompt = `You are an expert TOEIC exam question writer specializing in Part 5 (Incomplete Sentences).

CRITICAL RULES:
1. ALL content must be in English only (T2T Mode - Target-to-Target)
2. Each question must have exactly 4 OPTIONS (a, b, c, d)
3. **EXACTLY ONE CORRECT ANSWER**: Only ONE option can be correct. The other 3 must be clearly WRONG.
4. **ALL OPTIONS MUST BE DISTINCT**: No two options can be identical or mean the same thing.
5. Distractors must be plausible but DEFINITIVELY wrong - NO ambiguity
6. Questions should reflect real TOEIC exam difficulty and topics
7. Use business English contexts appropriate for international communication
8. STIMULUS LENGTH: Write natural business English sentences (typical 100-150 characters, up to 200 for complex grammar). Match real TOEIC style.
9. EXPLANATION: Must be in Traditional Chinese (繁體中文) to explain why the answer is correct.

OUTPUT FORMAT:
Return a JSON array of question objects with this exact structure:
{
  "stimulus": "The incomplete sentence with _____ for the blank",
  "interaction": {
    "a": "option A",
    "b": "option B", 
    "c": "option C",
    "d": "option D"
  },
  "correctAnswer": "the correct option key (a, b, c, or d)",
  "explanation": "Brief explanation in Traditional Chinese (繁體中文) why this is correct"
}

AVOID:
- Multiple correct answers or ambiguous options
- Duplicate or nearly identical options`

const posPrompt: PromptConfig = {
    systemPrompt: `${baseSystemPrompt}

FOCUS: Part of Speech (詞性判斷)
- Create questions testing word form/part of speech recognition
- Use the SAME root word in different forms (noun, verb, adjective, adverb)
- Example: negotiate (v) / negotiation (n) / negotiable (adj) / negotiably (adv)
- Test sentence structure analysis (subject/verb/object positions)

DISTRACTOR STRATEGY:
- All options should share the same root word
- Mix noun/verb/adjective/adverb forms
- Common traps: -tion (noun) vs -tive (adj) vs -ly (adv)`,

    userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} TOEIC Part 5 Part-of-Speech questions.
Difficulty: TOEIC score range ${getToeicScoreRange(rank)}
Topic Context: ${topic || 'General Business'}

Format:
- Use _____ to indicate the blank position
- Example: The company made a _____ decision. (Options: strategic, strategically, strategy, strategize)

Focus on testing:
- Recognition of noun/verb/adjective/adverb positions
- Same-root word transformations
- Sentence structure analysis
`,
}

const tensePrompt: PromptConfig = {
    systemPrompt: `${baseSystemPrompt}

FOCUS: Verb Tense & Voice (時態與語態)
- Create questions testing verb tense and active/passive voice
- Include time markers that indicate the correct tense
- Examples: yesterday (past), next week (future), has been (present perfect)

DISTRACTOR STRATEGY:
- Mix simple/continuous/perfect tenses
- Include both active and passive voice options
- Use similar-sounding but grammatically incorrect forms`,

    userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} TOEIC Part 5 Verb Tense questions.
Difficulty: TOEIC score range ${getToeicScoreRange(rank)}
Topic Context: ${topic || 'General Business'}

Format:
- Use _____ to indicate the blank position
- Example: The report _____ by the deadline yesterday. (Options: submitted, was submitted, has submitted, will submit)

Include clear time indicators:
- Past markers: yesterday, last week, ago
- Present markers: now, currently, always
- Future markers: tomorrow, next, will
- Perfect markers: already, since, for
`,
}

const vocabPrompt: PromptConfig = {
    systemPrompt: `${baseSystemPrompt}

FOCUS: Vocabulary (情境單字)
- Create context-based vocabulary questions
- Test word meanings in business contexts
- Focus on commonly confused words

IMPORTANT FORMAT:
- Use _____ to indicate the blank position
- When explaining vocabulary in options or examples, use "quotes" to highlight words
- Example: The "contract" was signed. vs The "contact" information was wrong.

DISTRACTOR STRATEGY:
- Use words with similar spelling (contact/contract/contrast)
- Use words with related but incorrect meanings
- Include common false friends for non-native speakers`,

    userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} TOEIC Part 5 Vocabulary questions.
Difficulty: TOEIC score range ${getToeicScoreRange(rank)}
Topic Context: ${topic || 'General Business'}

Format:
- Use _____ to indicate the blank position
- Example: Please _____ the documents before the meeting. (Options: review, revise, renew, remove)

Focus on:
- Business terminology
- Commonly confused word pairs
- Context-dependent word choice
`,
}

const prepPrompt: PromptConfig = {
    systemPrompt: `${baseSystemPrompt}

FOCUS: Prepositions & Conjunctions (介系詞/連接詞)
- Create questions testing preposition usage
- Focus on fixed collocations and phrasal verbs
- Test logical connectors

DISTRACTOR STRATEGY:
- Use commonly confused prepositions (in/on/at, for/to/with)
- Include phrasal verb particles
- Test common idioms and fixed expressions

COMMON PATTERNS:
- look forward TO (not for)
- depend ON (not of)
- in charge OF (not for)
- comply WITH (not to)`,

    userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} TOEIC Part 5 Preposition/Conjunction questions.
Difficulty: TOEIC score range ${getToeicScoreRange(rank)}
Topic Context: ${topic || 'General Business'}

Format:
- Use _____ to indicate the blank position
- Example: We look forward _____ hearing from you. (Options: to, for, at, with)

Include:
- Fixed collocations
- Phrasal verbs
- Common business idioms
`,
}

const pronounsPrompt: PromptConfig = {
    systemPrompt: `${baseSystemPrompt}

FOCUS: Pronouns (代名詞/關係代名詞)
- Test personal, possessive, reflexive, and relative pronouns
- Focus on pronoun-antecedent agreement
- Include relative clauses (who/which/that/whose)

FEW-SHOT EXAMPLES:

Example 1 (Reflexive pronoun):
The manager _____ approved the budget changes.
a) himself ✓
b) his
c) him
d) he

Example 2 (Relative pronoun):
The employee _____ submitted the report was promoted.
a) who ✓
b) whose
c) whom
d) which

Example 3 (Possessive):
Each employee must submit _____ expense report by Friday.
a) their ✓ (singular they accepted in TOEIC)
b) its
c) our
d) your

DISTRACTOR STRATEGY:
- Mix subject/object/possessive/reflexive forms
- Confuse who/whom/whose/which
- Test singular vs plural agreement`,

    userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} TOEIC Part 5 Pronoun questions.
Difficulty: TOEIC score range ${getToeicScoreRange(rank)}
Topic Context: ${topic || 'General Business'}

Format:
- Use _____ to indicate the blank position
- Example: The client asked to speak to _____ directly. (Options: him, his, himself, he)

Focus on:
- Personal pronouns (I/me/my/mine/myself)
- Relative pronouns (who/which/that/whose)
- Pronoun-antecedent agreement
`,
}

const agreementPrompt: PromptConfig = {
    systemPrompt: `${baseSystemPrompt}

FOCUS: Subject-Verb Agreement (主詞動詞一致)
- Test singular/plural verb agreement
- Focus on tricky subjects (collective nouns, indefinite pronouns)
- Include intervening phrases that may confuse

FEW-SHOT EXAMPLES:

Example 1 (Indefinite pronoun):
Everyone in the departments _____ required to attend.
a) is ✓
b) are
c) were
d) have been

Example 2 (Collective noun):
The committee _____ its final decision next week.
a) will announce ✓
b) will announces
c) announce
d) announcing

Example 3 (Intervening phrase):
The price of these products _____ increased.
a) has ✓
b) have
c) are
d) were

DISTRACTOR STRATEGY:
- Use words between subject and verb to confuse
- Mix singular/plural verb forms
- Include collective nouns (team, staff, committee)`,

    userPromptTemplate: ({ rank, topic, count }) => `
Generate ${count} TOEIC Part 5 Subject-Verb Agreement questions.
Difficulty: TOEIC score range ${getToeicScoreRange(rank)}
Topic Context: ${topic || 'General Business'}

Format:
- Use _____ to indicate the blank position
- Example: The team of analysts _____ completed the report. (Options: has, have, is, are)

Focus on:
- Collective nouns
- Indefinite pronouns (everyone, each, nobody)
- Intervening prepositional phrases
`,
}

function getToeicScoreRange(rank: number): string {
    const ranges: Record<number, string> = {
        1: '0-215 (Novice)',
        2: '220-465 (Basic)',
        3: '470-725 (Intermediate)',
        4: '730-855 (Advanced)',
        5: '860-990 (Expert)',
    }
    return ranges[rank] || '470-725 (Intermediate)'
}

export function getToeicPrompt(examQuestionType: ExamQuestionType): PromptConfig {
    const prompts: Record<string, PromptConfig> = {
        toeic_part5_pos: posPrompt,
        toeic_part5_tense: tensePrompt,
        toeic_part5_vocab: vocabPrompt,
        toeic_part5_prep: prepPrompt,
        toeic_part5_pronouns: pronounsPrompt,
        toeic_part5_agreement: agreementPrompt,
    }

    const prompt = prompts[examQuestionType]
    if (!prompt) {
        throw new Error(`Unknown TOEIC question type: ${examQuestionType}`)
    }
    return prompt
}

