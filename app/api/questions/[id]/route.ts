import { NextRequest, NextResponse } from 'next/server'
import { getQuestionById, updateQuestion, deleteQuestion } from '@/lib/factory'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    try {
        const question = await getQuestionById(id)

        if (!question) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 })
        }

        return NextResponse.json(question)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch question' }, { status: 500 })
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const body = await request.json()

    try {
        const updated = await updateQuestion(id, {
            stimulus: body.stimulus,
            interaction: body.interaction,
            correctAnswer: body.correctAnswer,
            explanation: body.explanation,
            topic: body.topic,
        })

        return NextResponse.json(updated)
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update question' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const force = request.nextUrl.searchParams.get('force') === 'true'

    try {
        const deleted = await deleteQuestion(id, force)

        if (!deleted) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete question' },
            { status: 400 }
        )
    }
}
