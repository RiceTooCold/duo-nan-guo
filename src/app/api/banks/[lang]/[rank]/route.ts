import { NextRequest, NextResponse } from 'next/server'
import { TargetLanguage } from '@/generated/prisma'
import { getBankStats } from '@/lib/services/question'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ lang: string; rank: string }> }
) {
    const { lang, rank } = await params
    const rankNum = parseInt(rank)

    // Validate language
    if (!['EN', 'JP', 'KR', 'CN'].includes(lang)) {
        return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
    }

    // Validate rank
    if (isNaN(rankNum) || rankNum < 1 || rankNum > 6) {
        return NextResponse.json({ error: 'Invalid rank' }, { status: 400 })
    }

    try {
        const stats = await getBankStats(lang as TargetLanguage, rankNum)
        return NextResponse.json(stats)
    } catch (error) {
        console.error('Failed to fetch bank stats:', error)
        return NextResponse.json(
            { error: 'Failed to fetch bank stats' },
            { status: 500 }
        )
    }
}
