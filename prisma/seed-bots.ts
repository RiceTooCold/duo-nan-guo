/**
 * Seed script: Create Bot Users for LLM models
 * Run: npx tsx prisma/seed-bots.ts
 */

import { PrismaClient, UserRole } from '@/generated/prisma';

const prisma = new PrismaClient();

const BOT_USERS = [
    {
        name: 'Gemma Bot',
        email: 'bot-gemma@duo-nan-guo.local',
        isBot: true,
        botModel: 'gemma-3-27b-it',
        role: UserRole.user,
        stats: {
            totalMatches: 0,
            wins: 0,
            losses: 0,
            ties: 0,
            correctRate: 0,
            totalXp: 0,
        },
    },
    {
        name: 'Llama Bot',
        email: 'bot-llama@duo-nan-guo.local',
        isBot: true,
        botModel: 'llama-3.3-70b-versatile',
        role: UserRole.user,
        stats: {
            totalMatches: 0,
            wins: 0,
            losses: 0,
            ties: 0,
            correctRate: 0,
            totalXp: 0,
        },
    },
    {
        name: 'Gemini Bot',
        email: 'bot-gemini@duo-nan-guo.local',
        isBot: true,
        botModel: 'gemini-2.0-flash',
        role: UserRole.user,
        stats: {
            totalMatches: 0,
            wins: 0,
            losses: 0,
            ties: 0,
            correctRate: 0,
            totalXp: 0,
        },
    },
];

async function main() {
    console.log('🤖 Seeding Bot Users...\n');

    for (const bot of BOT_USERS) {
        const existing = await prisma.user.findFirst({
            where: { email: bot.email },
        });

        if (existing) {
            console.log(`  ⏭️  ${bot.name} already exists (id: ${existing.id})`);
            continue;
        }

        const created = await prisma.user.create({
            data: bot,
        });

        console.log(`  ✅ Created ${bot.name} (id: ${created.id})`);
    }

    console.log('\n🎉 Bot seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
