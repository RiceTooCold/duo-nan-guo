import { NextResponse } from 'next/server'
import { getAllBanksOverview } from '@/lib/factory'

export async function GET() {
    try {
        const banks = await getAllBanksOverview()
        return NextResponse.json(banks)
    } catch (error) {
        console.error('Failed to fetch banks:', error)
        return NextResponse.json(
            { error: 'Failed to fetch banks' },
            { status: 500 }
        )
    }
}
