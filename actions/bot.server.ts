'use server';

import { prisma } from '@/lib/prisma';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

// Create providers for different models
const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
});

const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Model registry - maps botModel string to AI SDK model
function getModel(botModel: string) {
    switch (botModel) {
        case 'gemma-3-27b-it':
            return google('gemma-3-27b-it'); // Use Google AI's gemma
        case 'llama-3.3-70b-versatile':
            return groq('llama-3.3-70b-versatile');
        case 'gpt-4o-mini':
            return openai('gpt-4o-mini');
        default:
            return google('gemma-3-27b-it'); // fallback to gemma
    }
}

interface BotAnswerResult {
    answer: string;         // The answer key (a, b, c, or d)
    thinkingMs: number;     // Actual API response time
    confidence: number;     // Fixed value since we removed difficulty
}

/**
 * Get LLM Bot's answer for a question.
 * Uses Vercel AI SDK for unified model interface.
 * The model responds naturally without artificial difficulty adjustment.
 */
export async function getBotAnswer(
    matchId: string,
    questionId: string,
    botModel: string = 'gemma-3-27b-it'
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

        // 2. Build simple prompt - let model respond naturally
        const prompt = `You are taking a ${question.targetLanguage} language exam.

Question: ${question.stimulus}

Options:
A) ${options.a}
B) ${options.b}
C) ${options.c}
D) ${options.d}

Reply with ONLY the letter (A, B, C, or D) that you think is correct. No explanation.`;

        // 3. Call model via Vercel AI SDK
        const startTime = Date.now();

        const { text } = await generateText({
            model: getModel(botModel),
            prompt,
            temperature: 0.3,
        });

        const thinkingMs = Date.now() - startTime;

        // 4. Parse response
        const response = text.trim().toUpperCase();
        const answerMatch = response.match(/^[ABCD]/);
        const answer = answerMatch ? answerMatch[0].toLowerCase() : getRandomAnswer();

        return {
            answer,
            thinkingMs,
            confidence: 0.8, // Fixed confidence since we removed difficulty
        };

    } catch (error) {
        console.error('Bot answer error:', error);
        return getRandomFallback();
    }
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
