'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trophy, Star, Calendar, ChevronRight, Settings } from 'lucide-react'
import { Avatar } from './components/Avatar'

// Mock user data
const mockUser = {
  name: '語言達人',
  level: 15,
  totalScore: 12580,
  avatar: '/mascot-parrot.png',
}

// Mock game records
const mockRecords = [
  { id: 1, date: '2024-01-15', language: 'ko', difficulty: 1, score: 850, correct: 8, total: 10 },
  { id: 2, date: '2024-01-14', language: 'ja', difficulty: 3, score: 720, correct: 7, total: 10 },
  { id: 3, date: '2024-01-13', language: 'en', difficulty: 2, score: 950, correct: 9, total: 10 },
  { id: 4, date: '2024-01-12', language: 'zh', difficulty: 4, score: 680, correct: 6, total: 10 },
  { id: 5, date: '2024-01-11', language: 'ko', difficulty: 2, score: 780, correct: 8, total: 10 },
]

const languageInfo: Record<string, { flag: string; name: string }> = {
  ko: { flag: '🇰🇷', name: '韓文' },
  ja: { flag: '🇯🇵', name: '日文' },
  en: { flag: '🇺🇸', name: '英文' },
  zh: { flag: '🇨🇳', name: '中文' },
}

export function ProfileScreen() {
  const router = useRouter()
  
  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-[#D5E3F7] to-white">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm">
        <h1 className="text-lg font-bold text-[#333]">個人檔案</h1>
        <Link href="/settings">
          <button className="p-2 rounded-full hover:bg-[#D5E3F7] transition-colors">
            <Settings className="w-5 h-5 text-[#64748b]" />
          </button>
        </Link>
      </header>

      {/* User Profile Card */}
      <motion.section
        className="mx-4 mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="bg-white rounded-3xl border-2 border-[#D5E3F7] p-6 flex flex-col items-center shadow-sm">
          {/* Avatar */}
          <motion.div
            className="mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <Avatar
              src={mockUser.avatar}
              alt="User Avatar"
              fallback="🦜"
              size="lg"
              badge="level"
              badgeValue={mockUser.level}
            />
          </motion.div>

          {/* User Name */}
          <h2 className="text-xl font-bold text-[#333] mb-4">{mockUser.name}</h2>

          {/* Stats */}
          <div className="flex gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-[#f59e0b] mb-1">
                <Trophy className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-[#333]">{mockUser.totalScore.toLocaleString()}</p>
              <p className="text-xs text-[#64748b]">總積分</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-[#5B8BD4] mb-1">
                <Star className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-[#333]">{mockRecords.length}</p>
              <p className="text-xs text-[#64748b]">對戰場數</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Game Records */}
      <section className="flex-1 px-4 pb-28 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#333] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#5B8BD4]" />
            遊戲紀錄
          </h3>
          <span className="text-sm text-[#64748b]">
            共 {mockRecords.length} 場
          </span>
        </div>

        <div className="space-y-3">
          {mockRecords.map((record, index) => (
            <motion.div
              key={record.id}
              className="bg-white rounded-2xl border-2 border-[#D5E3F7] p-4 flex items-center gap-4 shadow-sm cursor-pointer"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.01 }}
              onClick={() => router.push(`/record/${record.id}`)}
            >
              {/* Language Flag */}
              <div className="w-12 h-12 rounded-xl bg-[#D5E3F7] flex items-center justify-center text-2xl">
                {languageInfo[record.language].flag}
              </div>

              {/* Record Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[#333]">
                    {languageInfo[record.language].name}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-[#A9C4EB] rounded-full text-[#333]">
                    {record.difficulty}級
                  </span>
                </div>
                <p className="text-sm text-[#64748b]">
                  {record.date} · {record.correct}/{record.total} 正確
                </p>
              </div>

              {/* Score */}
              <div className="text-right">
                <p className="text-lg font-bold text-[#5B8BD4]">{record.score}</p>
                <p className="text-xs text-[#64748b]">分</p>
              </div>

              <ChevronRight className="w-5 h-5 text-[#64748b]" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] p-4 bg-gradient-to-t from-white via-white/95 to-transparent">
        <Link href="/room" className="block">
          <motion.button
            className="w-full py-4 text-lg font-semibold text-white bg-[#5B8BD4] rounded-2xl"
            style={{ boxShadow: '0 10px 25px -5px rgba(91, 139, 212, 0.4)' }}
            whileHover={{ scale: 1.02, backgroundColor: '#4A7BC4' }}
            whileTap={{ scale: 0.98 }}
          >
            開設遊戲房間
          </motion.button>
        </Link>
      </div>
    </div>
  )
}
