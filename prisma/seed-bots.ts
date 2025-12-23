/**
 * Seed script: Create Bot Users for LLM models
 * Run: npx tsx prisma/seed-bots.ts
 */

import { PrismaClient, UserRole } from '@/generated/prisma';

const prisma = new PrismaClient();

const BOT_USERS = [
    {
        name: 'Gemma',
        email: 'bot-gemma@duo-nan-guo.local',
        isBot: true,
        botModel: 'gemma-3-27b-it',
        role: UserRole.user,
        image: '/gemma.png',
        // Note: stats are now calculated on-the-fly from Match/AnswerRecord
    },
    {
        name: 'Llama',
        email: 'bot-llama@duo-nan-guo.local',
        isBot: true,
        botModel: 'llama-3.3-70b-versatile',
        role: UserRole.user,
        image: '/llama.png',
    },
    {
        name: 'GPT-4o-mini',
        email: 'bot-gpt4o-mini@duo-nan-guo.local',
        isBot: true,
        botModel: 'gpt-4o-mini',
        role: UserRole.user,
        image: '/gpt.png',
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
