import { NextRequest, NextResponse } from 'next/server'
import { TargetLanguage, ExamQuestionType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ lang: string; rank: string }> }
) {
    const { lang, rank } = await params
    const targetLanguage = lang as TargetLanguage
    const rankNum = parseInt(rank)

    // Get filter parameters from query string
    const { searchParams } = new URL(request.url)
    const humanTouchedParam = searchParams.get('humanTouched') // 'true' | 'false' | null
    const typeParam = searchParams.get('type') // ExamQuestionType | null

    if (!['EN', 'JP', 'KR', 'CN'].includes(targetLanguage)) {
        return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
    }

    if (isNaN(rankNum) || rankNum < 1 || rankNum > 6) {
        return NextResponse.json({ error: 'Invalid rank' }, { status: 400 })
    }

    try {
        // Build where clause with filters
        const where: Prisma.QuestionWhereInput = {
            targetLanguage,
            rank: rankNum,
        }

        // Apply humanTouched filter
        if (humanTouchedParam === 'true') {
            where.isHumanTouched = true
        } else if (humanTouchedParam === 'false') {
            where.isHumanTouched = false
        }

        // Apply type filter
        if (typeParam) {
            where.examQuestionType = typeParam as ExamQuestionType
        }

        // Delete matching questions
        const result = await prisma.question.deleteMany({ where })

        return NextResponse.json({
            success: true,
            deletedCount: result.count,
        })
    } catch (error) {
        console.error('Clear bank error:', error)
        return NextResponse.json(
            { error: 'Failed to clear bank' },
            { status: 500 }
        )
    }
}
