import { NextResponse } from 'next/server'
import { getQuestionStats } from '@/lib/factory'

export async function GET() {
    try {
        const stats = await getQuestionStats()
        return NextResponse.json(stats)
    } catch (error) {
        console.error('Failed to fetch question stats:', error)
        return NextResponse.json(
            { error: 'Failed to fetch question stats' },
            { status: 500 }
        )
    }
}
