'use server';

import { prisma } from '@/lib/prisma';
import { genAI } from '@/lib/factory/ai/gemini';

// Create a dedicated model for the game bot
// Uses lower temperature for more consistent "student-like" behavior
const botModel = genAI.getGenerativeModel({
    model: 'gemma-3-1b-it',
    generationConfig: {
        temperature: 0.5, // Moderate creativity
        maxOutputTokens: 50, // Only need short response
    },
});

interface BotAnswerResult {
    answer: string;         // The answer key (a, b, c, or d)
    thinkingMs: number;     // Simulated thinking time
    confidence: number;     // 0-1, for future difficulty adjustment
}

/**
 * Get LLM Bot's answer for a question.
 * The bot acts like a language learner taking the exam.
 */
export async function getBotAnswer(
    matchId: string,
    questionId: string,
    botDifficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<BotAnswerResult> {
    try {
        // 1. Fetch question from DB
        const question = await prisma.question.findUnique({
            where: { id: questionId },
            select: {
                stimulus: true,
                interaction: true,
                targetLanguage: true,
                rank: true,
            },
        });

        if (!question) {
            console.warn(`Question ${questionId} not found, returning random answer`);
            return getRandomFallback();
        }

        const options = question.interaction as Record<string, string>;

        // 2. Build prompt based on difficulty
        const difficultyPrompt = getDifficultyInstruction(botDifficulty);

        const prompt = `You are a ${difficultyPrompt} language learner taking a ${question.targetLanguage} exam (level ${question.rank}).

Question: ${question.stimulus}

Options:
A) ${options.a}
B) ${options.b}
C) ${options.c}
D) ${options.d}

Reply with ONLY the letter (A, B, C, or D) that you think is correct. No explanation.`;

        // 3. Call Gemini with logging
        console.log(`🤖 [LLM Bot] Calling Gemini for question: "${question.stimulus.substring(0, 100)}..." (difficulty: ${botDifficulty})`);
        const startTime = Date.now();

        const result = await botModel.generateContent(prompt);
        const response = result.response.text().trim().toUpperCase();

        const apiTime = Date.now() - startTime;
        console.log(`🤖 [LLM Bot] Gemini responded in ${apiTime}ms: "${response}"`);

        // 4. Parse response
        const answerMatch = response.match(/^[ABCD]/);
        const answer = answerMatch ? answerMatch[0].toLowerCase() : getRandomAnswer();

        if (!answerMatch) {
            console.warn(`🤖 [LLM Bot] Could not parse answer from response, using random: ${answer}`);
        } else {
            console.log(`🤖 [LLM Bot] Final answer: ${answer.toUpperCase()}`);
        }

        // 5. Simulate thinking time based on difficulty
        const thinkingMs = getThinkingTime(botDifficulty);

        return {
            answer,
            thinkingMs,
            confidence: botDifficulty === 'hard' ? 0.9 : botDifficulty === 'medium' ? 0.7 : 0.5,
        };

    } catch (error) {
        console.error('Bot answer error:', error);
        return getRandomFallback();
    }
}

function getDifficultyInstruction(difficulty: 'easy' | 'medium' | 'hard'): string {
    switch (difficulty) {
        case 'easy':
            return 'beginner-level';
        case 'medium':
            return 'intermediate';
        case 'hard':
            return 'advanced and very accurate';
        default:
            return 'intermediate';
    }
}

function getThinkingTime(difficulty: 'easy' | 'medium' | 'hard'): number {
    // Harder bots "think" faster (more confident)
    const baseMs = difficulty === 'hard' ? 1500 : difficulty === 'medium' ? 2500 : 3500;
    const variance = 1000;
    return baseMs + Math.random() * variance;
}

function getRandomAnswer(): string {
    const answers = ['a', 'b', 'c', 'd'];
    return answers[Math.floor(Math.random() * answers.length)];
}

function getRandomFallback(): BotAnswerResult {
    return {
        answer: getRandomAnswer(),
        thinkingMs: 2000 + Math.random() * 2000,
        confidence: 0.25,
    };
}
