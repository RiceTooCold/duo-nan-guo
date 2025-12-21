'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Users, Bot } from 'lucide-react'
import { CountdownOverlay } from './components/CountdownOverlay'

const languages = [
  { id: 'ja', flag: '🇯🇵', name: '日文', exam: 'JLPT', levels: ['N5', 'N4', 'N3', 'N2', 'N1'] },
  { id: 'en', flag: '🇺🇸', name: '英文', exam: 'TOEIC', levels: ['初級', '中級', '中高級', '高級'] },
  { id: 'ko', flag: '🇰🇷', name: '韓文', exam: 'TOPIK', levels: ['1級', '2級', '3級', '4級', '5級', '6級'] },
  { id: 'zh', flag: '🇨🇳', name: '中文', exam: 'HSK', levels: ['1級', '2級', '3級', '4級', '5級', '6級'] },
]

const questionCounts = [5, 10, 20]

export function RoomSetupScreen({
  onComplete
}: {
  onComplete?: (settings: { lang: string; level: string; count: number; mode: 'bot' | 'player' }) => void
}) {
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [selectedCount, setSelectedCount] = useState(10)
  const [opponent, setOpponent] = useState<'bot' | 'player'>('bot')

  const selectedLangData = languages.find(l => l.id === selectedLanguage)

  const handleStartBattle = () => {
    if (onComplete && selectedLanguage && selectedLevel) {
      onComplete({
        lang: selectedLanguage,
        level: selectedLevel,
        count: selectedCount,
        mode: opponent
      })
    }
  }

  const isReady = selectedLanguage && selectedLevel && selectedCount

  return (
    <div className="min-h-dvh flex flex-col bg-[#F5F8FC] relative">
      {/* Header */}
      <header className="px-4 py-4 border-b-2 border-[#D5E3F7] flex items-center gap-4 bg-white">
        <Link
          href="/profile"
          className="p-2 -ml-2 rounded-full hover:bg-[#D5E3F7] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#333]" />
        </Link>
        <h1 className="text-lg font-bold text-[#333]">開設房間</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-28 space-y-6">
        {/* Language Selection */}
        <section>
          <h2 className="text-sm font-semibold text-[#64748b] mb-3">選擇語言</h2>
          <div className="grid grid-cols-2 gap-3">
            {languages.map((lang) => (
              <motion.button
                key={lang.id}
                onClick={() => {
                  setSelectedLanguage(lang.id)
                  setSelectedLevel(null)
                }}
                className={`p-4 rounded-2xl border-2 transition-all ${selectedLanguage === lang.id
                  ? 'border-[#5B8BD4] bg-[#D5E3F7]'
                  : 'border-[#D5E3F7] bg-white hover:bg-[#D5E3F7]'
                  }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-3xl mb-2 block">{lang.flag}</span>
                <span className="font-semibold text-[#333]">{lang.name}</span>
                <span className="text-xs text-[#64748b] block">{lang.exam}</span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Difficulty Selection */}
        {selectedLangData && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <h2 className="text-sm font-semibold text-[#64748b] mb-3">
              選擇難度 ({selectedLangData.exam})
            </h2>
            <div className="flex flex-wrap gap-2">
              {selectedLangData.levels.map((level) => (
                <motion.button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${selectedLevel === level
                    ? 'bg-[#5B8BD4] text-white'
                    : 'bg-white border-2 border-[#D5E3F7] text-[#333] hover:bg-[#D5E3F7]'
                    }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {level}
                </motion.button>
              ))}
            </div>
          </motion.section>
        )}

        {/* Question Count */}
        <section>
          <h2 className="text-sm font-semibold text-[#64748b] mb-3">題數</h2>
          <div className="flex gap-3">
            {questionCounts.map((count) => (
              <motion.button
                key={count}
                onClick={() => setSelectedCount(count)}
                className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${selectedCount === count
                  ? 'bg-[#5B8BD4] text-white'
                  : 'bg-white border-2 border-[#D5E3F7] text-[#333] hover:bg-[#D5E3F7]'
                  }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {count}題
              </motion.button>
            ))}
          </div>
        </section>

        {/* Opponent Selection */}
        <section>
          <h2 className="text-sm font-semibold text-[#64748b] mb-3">對手</h2>
          <div className="flex gap-3">
            <motion.button
              onClick={() => setOpponent('bot')}
              className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${opponent === 'bot'
                ? 'border-[#5B8BD4] bg-[#D5E3F7]'
                : 'border-[#D5E3F7] bg-white hover:bg-[#D5E3F7]'
                }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Bot className="w-8 h-8 text-[#3b82f6]" />
              <span className="font-semibold text-[#333]">AI Bot</span>
              <span className="text-xs text-[#64748b]">單人練習</span>
            </motion.button>
            <motion.button
              onClick={() => setOpponent('player')}
              className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${opponent === 'player'
                ? 'border-[#5B8BD4] bg-[#D5E3F7]'
                : 'border-[#D5E3F7] bg-white hover:bg-[#D5E3F7]'
                }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Users className="w-8 h-8 text-[#22c55e]" />
              <span className="font-semibold text-[#333]">真人對戰</span>
              <span className="text-xs text-[#64748b]">配對玩家</span>
            </motion.button>
          </div>
        </section>

        {/* Room Summary */}
        {isReady && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#D5E3F7] rounded-2xl p-4"
          >
            <h3 className="text-sm font-semibold text-[#64748b] mb-2">房間設定</h3>
            <div className="flex items-center gap-4 text-[#333]">
              <span className="text-2xl">
                {languages.find(l => l.id === selectedLanguage)?.flag}
              </span>
              <div>
                <p className="font-bold">
                  {languages.find(l => l.id === selectedLanguage)?.name} {selectedLevel}
                </p>
                <p className="text-sm text-[#64748b]">
                  {selectedCount}題 · {opponent === 'bot' ? 'AI 對戰' : '真人對戰'}
                </p>
              </div>
            </div>
          </motion.section>
        )}
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] p-4 bg-gradient-to-t from-[#F5F8FC] via-[#F5F8FC]/95 to-transparent">
        <motion.button
          onClick={handleStartBattle}
          disabled={!isReady}
          className={`w-full py-4 text-lg font-semibold rounded-2xl transition-all ${isReady
            ? 'bg-[#5B8BD4] text-white'
            : 'bg-[#D5E3F7] text-[#64748b] cursor-not-allowed'
            }`}
          style={{ boxShadow: isReady ? '0 10px 25px -5px rgba(91, 139, 212, 0.4)' : 'none' }}
          whileHover={isReady ? { scale: 1.02, backgroundColor: '#4A7BC4' } : {}}
          whileTap={isReady ? { scale: 0.98 } : {}}
        >
          開始對戰
        </motion.button>
      </div>
    </div>
  )
}
