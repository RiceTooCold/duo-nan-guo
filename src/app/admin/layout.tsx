'use client'

import { GenerationProvider } from '@/contexts/GenerationContext'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <GenerationProvider>
            {children}
        </GenerationProvider>
    )
}
