import { criticModel } from '@/lib/factory/ai/gemini'
import { GeneratedQuestion } from '../../services/generator'
import { TargetLanguage, ExamQuestionType } from '@/generated/prisma'
import { rateLimiter } from '@/lib/factory/utils/rate-limiter'
import { createSharedContext, formatContextForPrompt } from '@/lib/factory/ai/shared-context'

export interface CriticIssue {
    severity: 'CRITICAL' | 'WARNING'
    type: string
    description: string
}

export interface CriticResult {
    score: number // 0-100 quality score (for ranking passed questions)
    feedback: string // Human-readable summary
    issues: CriticIssue[] // Structured issue list
    suggestions: string[]
    approved: boolean // true only if NO CRITICAL issues
}

export interface CriticParams {
    question: GeneratedQuestion
    targetLanguage: TargetLanguage
    examQuestionType: ExamQuestionType
    rank: number
    topic?: string  // Topic for context evaluation
    existingQuestions?: { stimulus: string; correctAnswer: string; interaction: { a: string; b: string; c: string; d: string } }[]  // For dedup check
}

const CRITIC_SYSTEM_PROMPT = `You are an exam question quality reviewer. Evaluate the question and return JSON.

## CORE REQUIREMENT
A valid question MUST have EXACTLY ONE correct answer. All 4 options must be distinct.

## CRITICAL ISSUES (Auto-Reject)

| Type | Description |
|------|-------------|
| multiple_correct | More than one option could be the correct answer |
| no_correct | None of the 4 options is correct |
| duplicate_options | Two or more options are identical or nearly identical |
| answer_leaked | The answer is revealed in the stimulus |
| duplicate_stimulus | The stimulus (question text) is nearly identical to an existing question |
| duplicate_answer | The correct answer tests the SAME concept as an existing question |
| duplicate_options | Two or more OPTIONS within THIS question are identical (not comparing to existing) |
| language_error | Serious grammar or spelling error |

## WARNING ISSUES (Record but pass)

| Type | Description |
|------|-------------|
| verbose_stimulus | Stimulus is excessively long (>150 chars for simple fill-in, >250 chars for sentence ordering/content matching) |
| difficulty_mismatch | Difficulty doesn't match the level |
| unbalanced_options | Option lengths vary too much |

## SCORING (60-100)

Score breakdown:
- answerUniqueness (40 points max) - Is there exactly ONE correct answer?
- languageAccuracy (30 points max) - Grammar, spelling, natural expression
- difficultyMatch (20 points max) - Appropriate for the level
- clarity (10 points max) - Clear, concise stimulus

## OUTPUT FORMAT

Return JSON only:
{
  "issues": [{ "severity": "CRITICAL"|"WARNING", "type": "<type>", "description": "<description>" }],
  "score": <60-100>,
  "breakdown": {
    "answerUniqueness": <0-40>,
    "languageAccuracy": <0-30>,
    "difficultyMatch": <0-20>,
    "clarity": <0-10>
  },
  "suggestions": ["<improvement suggestion>"],
  "approved": <true if NO CRITICAL issues>
}`

/**
 * Critique a single question using Gemini Pro
 */
export async function critiqueQuestion(params: CriticParams): Promise<CriticResult> {
    const { question, targetLanguage, examQuestionType, rank, topic, existingQuestions } = params

    // Build existing questions section for dedup check
    let existingQuestionsSection = ''
    if (existingQuestions && existingQuestions.length > 0) {
        const existingList = existingQuestions
            .slice(0, 15) // Limit to 15 for context length
            .map((q, i) => {
                const opts = q.interaction
                return `${i + 1}. Stimulus: ${q.stimulus.substring(0, 80)}
   Options: a)${opts.a} b)${opts.b} c)${opts.c} d)${opts.d}
   Correct: ${q.correctAnswer}`
            })
            .join('\n\n')
        existingQuestionsSection = `

## EXISTING QUESTIONS FOR DUPLICATE CHECK:
${existingList}

DUPLICATE DETECTION RULES:
- duplicate_stimulus: Mark if the NEW stimulus is nearly identical to one above (same sentence structure with minor word changes)
- duplicate_answer: Mark if the NEW question tests the EXACT SAME target word/concept with the SAME correct answer value
- For duplicates, specify which existing question # it duplicates in the description
- Similar topics or grammar points are NOT duplicates - only nearly identical questions are
`
    } else {
        // No existing questions - explicitly tell critic NOT to mark as duplicate
        existingQuestionsSection = `

## NOTE: No existing questions provided. Do NOT mark as duplicate_concept.
`
    }

    // Build SharedContext
    const context = createSharedContext(targetLanguage, rank, examQuestionType, topic)

    const userPrompt = `
${formatContextForPrompt(context)}

Question:
${question.stimulus}

Options:
a) ${question.interaction.a}
b) ${question.interaction.b}
c) ${question.interaction.c}
d) ${question.interaction.d}

Marked Answer: ${question.correctAnswer}
${question.explanation ? `Explanation: ${question.explanation}` : ''}
${existingQuestionsSection}
Evaluate this question and return JSON.
`

    try {
        // Acquire rate limit token before making the call
        await rateLimiter.acquire()

        const result = await criticModel.generateContent([
            { text: CRITIC_SYSTEM_PROMPT },
            { text: userPrompt },
        ])

        const response = result.response
        const text = response.text()

        // Parse JSON response
        let parsed: Record<string, unknown>
        try {
            parsed = JSON.parse(text) as Record<string, unknown>
        } catch {
            // Try to extract JSON from markdown code blocks
            const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[1]) as Record<string, unknown>
            } else {
                throw new Error('Could not parse critic response')
            }
        }

        // Parse issues array - new format has severity/type/description objects
        const rawIssues = Array.isArray(parsed.issues) ? parsed.issues : []
        const issues: CriticIssue[] = rawIssues.map((issue: unknown) => {
            if (typeof issue === 'object' && issue !== null) {
                const obj = issue as Record<string, unknown>
                return {
                    severity: (obj.severity === 'WARNING' ? 'WARNING' : 'CRITICAL') as 'CRITICAL' | 'WARNING',
                    type: typeof obj.type === 'string' ? obj.type : 'unknown',
                    description: typeof obj.description === 'string' ? obj.description : String(issue),
                }
            }
            // Fallback for old string format - treat as CRITICAL
            return { severity: 'CRITICAL' as const, type: 'unknown', description: String(issue) }
        })

        // Check for CRITICAL issues
        const hasCritical = issues.some(i => i.severity === 'CRITICAL')

        return {
            score: typeof parsed.score === 'number' ? parsed.score : 0,
            feedback: generateFeedbackSummary(parsed, issues),
            issues,
            suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : [],
            approved: !hasCritical, // Approved only if NO CRITICAL issues
        }
    } catch (error) {
        return {
            score: 0,
            feedback: `Critic error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            issues: [{ severity: 'CRITICAL', type: 'error', description: 'Failed to critique question' }],
            suggestions: [],
            approved: false,
        }
    }
}

/**
 * Generate structured feedback for retry attempts and storage
 */
function generateFeedbackSummary(parsed: Record<string, unknown>, issues: CriticIssue[]): string {
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : []
    const score = typeof parsed.score === 'number' ? parsed.score : 0
    const breakdown = parsed.breakdown as Record<string, number> | undefined
    const criticalIssues = issues.filter(i => i.severity === 'CRITICAL')
    const warningIssues = issues.filter(i => i.severity === 'WARNING')
    const approved = criticalIssues.length === 0

    let feedback = approved
        ? `APPROVED (Score: ${score}/100)\n\n`
        : `REJECTED (${criticalIssues.length} critical issue${criticalIssues.length > 1 ? 's' : ''})\n\n`

    // Score breakdown
    if (breakdown) {
        feedback += `BREAKDOWN:\n`
        feedback += `• Answer Uniqueness: ${breakdown.answerUniqueness ?? 0}/40\n`
        feedback += `• Language Accuracy: ${breakdown.languageAccuracy ?? 0}/30\n`
        feedback += `• Difficulty Match: ${breakdown.difficultyMatch ?? 0}/20\n`
        feedback += `• Clarity: ${breakdown.clarity ?? 0}/10\n\n`
    }

    if (criticalIssues.length > 0) {
        feedback += `CRITICAL ISSUES:\n`
        criticalIssues.forEach(issue => {
            feedback += `• [${issue.type}] ${issue.description}\n`
        })
        feedback += '\n'
    }

    if (warningIssues.length > 0) {
        feedback += `WARNINGS:\n`
        warningIssues.forEach(issue => {
            feedback += `• [${issue.type}] ${issue.description}\n`
        })
        feedback += '\n'
    }

    if (!approved && suggestions.length > 0) {
        feedback += `SUGGESTIONS:\n`
        suggestions.slice(0, 3).forEach(sug => {
            feedback += `→ ${sug}\n`
        })
    }

    return feedback
}

/**
 * Critique multiple questions in batch
 * Rate limiting is handled by the shared rateLimiter
 */
export async function critiqueQuestions(
    questions: GeneratedQuestion[],
    targetLanguage: TargetLanguage,
    defaultExamQuestionType: ExamQuestionType,
    rank: number,
    onProgress?: (completed: number, total: number) => void
): Promise<CriticResult[]> {
    const results: CriticResult[] = []

    for (let i = 0; i < questions.length; i++) {
        const question = questions[i]

        // Use question's attached type/topic if available, otherwise use defaults
        const result = await critiqueQuestion({
            question,
            targetLanguage,
            examQuestionType: question.examQuestionType || defaultExamQuestionType,
            rank,
            topic: question.topic,
        })
        results.push(result)

        // Report progress
        onProgress?.(i + 1, questions.length)
    }

    return results
}
