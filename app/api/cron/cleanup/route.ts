'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MatchStatus } from '@prisma/client';

/**
 * Cron job to clean up stuck matches
 * Runs every 5 minutes via Vercel Cron
 * 
 * Marks matches as 'abandoned' if:
 * - status = 'playing'
 * - updatedAt > 10 minutes ago
 */
export async function GET(request: Request) {
    // Verify cron secret (optional but recommended for security)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Allow in development or if CRON_SECRET is not set
        if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    try {
        // Find stuck matches (playing but started > 10 minutes ago)
        const stuckMatches = await prisma.match.findMany({
            where: {
                status: MatchStatus.playing,
                startedAt: { lt: tenMinutesAgo },
            },
            select: { id: true },
        });

        if (stuckMatches.length === 0) {
            return NextResponse.json({
                message: 'No stuck matches found',
                cleaned: 0
            });
        }

        // Mark as abandoned
        const result = await prisma.match.updateMany({
            where: {
                id: { in: stuckMatches.map(m => m.id) },
            },
            data: {
                status: MatchStatus.abandoned,
            },
        });

        console.log(`🧹 [Cron] Cleaned ${result.count} abandoned matches`);

        return NextResponse.json({
            message: 'Cleanup complete',
            cleaned: result.count,
            matchIds: stuckMatches.map(m => m.id),
        });
    } catch (error) {
        console.error('Cron cleanup error:', error);
        return NextResponse.json(
            { error: 'Cleanup failed' },
            { status: 500 }
        );
    }
}
