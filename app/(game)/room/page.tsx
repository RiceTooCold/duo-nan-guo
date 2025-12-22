'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Users, Bot, Check } from 'lucide-react'
import { WaitingRoomScreen } from '@/components/game/WaitingRoomScreen'
import { createMatch, getBotUsers, type BotUserInfo } from '@/actions/game.server'
import { gameLanguages, questionCounts, levelToRank, type GameLanguageConfig } from '@/lib/config/game'
import type { TargetLanguage } from '@/generated/prisma'

type RoomPhase = 'setup' | 'waiting'

export default function RoomPage() {
  const router = useRouter()
  const { data: session } = useSession()

  // Room phase management
  const [roomPhase, setRoomPhase] = useState<RoomPhase>('setup')

  // Game settings
  const [selectedLanguage, setSelectedLanguage] = useState<GameLanguageConfig | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [selectedCount, setSelectedCount] = useState(10)
  const [opponent, setOpponent] = useState<'bot' | 'player'>('bot')

  // Bot selection
  const [botUsers, setBotUsers] = useState<BotUserInfo[]>([])
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null)

  // Fetch bot users on mount
  useEffect(() => {
    const fetchBots = async () => {
      const bots = await getBotUsers()
      setBotUsers(bots)
      if (bots.length > 0) {
        setSelectedBotId(bots[0].id) // Default to first bot
      }
    }
    fetchBots()
  }, [])

  const isReady = selectedLanguage && selectedLevel && selectedCount && (opponent === 'player' || selectedBotId)

  // When "開始對戰" is clicked, transition to waiting phase
  const handleStartBattle = () => {
    if (isReady) {
      setRoomPhase('waiting')
    }
  }

  // When WaitingRoom countdown completes: create match then navigate
  const handleWaitingComplete = async () => {
    if (!selectedLanguage || !selectedLevel) return

    try {
      // Convert level label to rank number
      const rank = levelToRank(selectedLanguage.id, selectedLevel)

      // Create match on server with real user ID and selected bot
      const { matchId } = await createMatch(
        session?.user?.id || null,
        {
          lang: selectedLanguage.id as TargetLanguage,
          rank,
          count: selectedCount,
        },
        opponent === 'bot' ? (selectedBotId || undefined) : undefined
      )

      // Navigate to battle with matchId
      router.push(`/battle?matchId=${matchId}`)
    } catch (err) {
      console.error('Failed to create match:', err)
      // Optionally show error and go back to setup
      setRoomPhase('setup')
    }
  }

  // Get selected bot info for display
  const selectedBot = botUsers.find(b => b.id === selectedBotId)

  // Render WaitingRoom phase
  if (roomPhase === 'waiting' && selectedLanguage && selectedLevel) {
    return (
      <WaitingRoomScreen
        language={selectedLanguage.name}
        level={selectedLevel}
        count={selectedCount}
        mode={opponent}
        userName={session?.user?.name}
        userAvatar={session?.user?.image}
        botName={selectedBot?.name}
        botModel={selectedBot?.botModel}
        onStart={handleWaitingComplete}
        onCancel={() => setRoomPhase('setup')}
      />
    )
  }

  // Render Setup phase
  return (
    <div className="min-h-dvh flex flex-col bg-[#F5F8FC] relative">
      {/* Header */}
      <header className="px-4 py-4 border-b-2 border-[#D5E3F7] flex items-center gap-4 bg-white">
        <Link
          href="/lobby"
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
            {gameLanguages.map((lang) => (
              <motion.button
                key={lang.id}
                onClick={() => {
                  setSelectedLanguage(lang)
                  setSelectedLevel(null)
                }}
                className={`p-4 rounded-2xl border-2 transition-all ${selectedLanguage?.id === lang.id
                  ? 'border-[#5B8BD4] bg-[#D5E3F7]'
                  : 'border-[#D5E3F7] bg-white hover:bg-[#D5E3F7]'
                  }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-3xl mb-2 block">{lang.flag}</span>
                <span className="font-semibold text-[#333]">{lang.name}</span>
                <span className="text-xs text-[#64748b] block">{lang.examName}</span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Difficulty Selection */}
        {selectedLanguage && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <h2 className="text-sm font-semibold text-[#64748b] mb-3">
              選擇難度 ({selectedLanguage.examName})
            </h2>
            <div className="flex flex-wrap gap-2">
              {selectedLanguage.levels.map((level) => (
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
          <h2 className="text-sm font-semibold text-[#64748b] mb-3">對手類型</h2>
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
              <span className="font-semibold text-[#333]">LLM Bot</span>
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

        {/* Bot Selection (when bot mode selected) */}
        {opponent === 'bot' && botUsers.length > 0 && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <h2 className="text-sm font-semibold text-[#64748b] mb-3">選擇 Bot</h2>
            <div className="grid grid-cols-3 gap-2">
              {botUsers.map((bot) => (
                <motion.button
                  key={bot.id}
                  onClick={() => setSelectedBotId(bot.id)}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 relative ${selectedBotId === bot.id
                    ? 'border-[#5B8BD4] bg-[#D5E3F7]'
                    : 'border-[#D5E3F7] bg-white hover:bg-[#D5E3F7]'
                    }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {selectedBotId === bot.id && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-[#5B8BD4] rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <span className="text-xl">🤖</span>
                  <span className="font-semibold text-[#333] text-xs truncate w-full text-center">
                    {bot.name.replace(' Bot', '')}
                  </span>
                  <span className="text-[10px] text-[#64748b] truncate w-full text-center">
                    {bot.botModel?.split('-')[0] || 'LLM'}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.section>
        )}

        {/* Room Summary */}
        {isReady && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#D5E3F7] rounded-2xl p-4"
          >
            <h3 className="text-sm font-semibold text-[#64748b] mb-2">房間設定</h3>
            <div className="flex items-center gap-4 text-[#333]">
              <span className="text-2xl">{selectedLanguage.flag}</span>
              <div>
                <p className="font-bold">
                  {selectedLanguage.name} {selectedLevel}
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
