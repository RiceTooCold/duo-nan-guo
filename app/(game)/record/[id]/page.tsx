'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function GameRecordDetailPage() {
  const params = useParams()
  const recordId = params.id as string

  return (
    <div className="min-h-dvh flex flex-col bg-[#F5F8FC]">
      <header className="px-4 py-4 border-b-2 border-[#D5E3F7] flex items-center gap-4 bg-white">
        <Link
          href="/profile"
          className="p-2 -ml-2 rounded-full hover:bg-[#D5E3F7] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#333]" />
        </Link>
        <h1 className="text-lg font-bold text-[#333]">對戰紀錄</h1>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-6xl mb-4">📝</p>
          <p className="text-[#64748b] font-bold">Record ID: {recordId}</p>
          <p className="text-sm text-[#64748b] mt-2">詳細紀錄功能開發中...</p>
        </div>
      </div>
    </div>
  )
}
