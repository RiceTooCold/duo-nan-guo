import { GoogleGenerativeAI } from '@google/generative-ai'

if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is required')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Generator Model - Gemini 2.5 Flash for high-throughput structured output
// Fast and supports JSON mode for reliable structured responses
export const generatorModel = genAI.getGenerativeModel({
    model: 'gemma-3-27b-it',
    generationConfig: {
        //responseMimeType: 'application/json',
        temperature: 0.8,
    },
})

// Critic Model - Gemini 2.5 Pro for deep reasoning and quality assurance
// More powerful model for critical evaluation tasks
export const criticModel = genAI.getGenerativeModel({
    model: 'gemma-3-27b-it',
    generationConfig: {
        temperature: 0.3,
    },
})

export { genAI }
