import { NextRequest, NextResponse } from 'next/server'
import { TargetLanguage, ExamQuestionType } from '@/generated/prisma'
import { getQuestions } from '@/lib/factory'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams

    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const lang = searchParams.get('lang')
    const rank = searchParams.get('rank')
    const type = searchParams.get('type')
    const humanTouched = searchParams.get('humanTouched')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    try {
        const { questions, total } = await getQuestions(
            {
                targetLanguage: lang ? (lang as TargetLanguage) : undefined,
                rank: rank ? parseInt(rank) : undefined,
                examQuestionType: type ? (type as ExamQuestionType) : undefined,
                isHumanTouched: humanTouched === 'true' ? true : humanTouched === 'false' ? false : undefined,
            },
            {
                page,
                pageSize,
                sortBy: sortBy as 'createdAt' | 'updatedAt' | 'criticScore',
                sortOrder: sortOrder as 'asc' | 'desc',
            }
        )

        return NextResponse.json({ questions, total })
    } catch (error) {
        console.error('Failed to fetch questions:', error)
        return NextResponse.json(
            { error: 'Failed to fetch questions' },
            { status: 500 }
        )
    }
}
