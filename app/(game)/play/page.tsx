'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Users, Bot, Check } from 'lucide-react'
import { createWaitingMatch, getBotUsers, type BotUserInfo } from '@/actions/game.server'
import { gameLanguages, questionCounts, levelToRank, type GameLanguageConfig } from '@/lib/config/game'
import type { TargetLanguage } from '@/generated/prisma'
import { Avatar } from '@/components/game/Avatar'
import { getGameLanguage } from '@/lib/config/game'

export default function PlayPage() {
    const router = useRouter()
    const { data: session } = useSession()

    // Game settings
    const [selectedLanguage, setSelectedLanguage] = useState<GameLanguageConfig | null>(null)
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
    const [selectedCount, setSelectedCount] = useState(10)
    const [opponent, setOpponent] = useState<'bot' | 'player'>('bot')

    // Bot selection
    const [botUsers, setBotUsers] = useState<BotUserInfo[]>([])
    const [selectedBotId, setSelectedBotId] = useState<string | null>(null)

    // Loading state
    const [isCreating, setIsCreating] = useState(false)

    // Fetch bot users on mount
    useEffect(() => {
        const fetchBots = async () => {
            const bots = await getBotUsers()
            setBotUsers(bots)
            if (bots.length > 0) {
                setSelectedBotId(bots[0].id)
            }
        }
        fetchBots()
    }, [])

    const isReady = selectedLanguage && selectedLevel && selectedCount && (opponent === 'player' || selectedBotId)

    // Create room and navigate to waiting room
    const handleCreateRoom = async () => {
        if (!isReady || !selectedLanguage || !selectedLevel || !session?.user?.id) return

        setIsCreating(true)
        try {
            const rank = levelToRank(selectedLanguage.id, selectedLevel)

            const { matchId } = await createWaitingMatch(session.user.id, {
                targetLanguage: selectedLanguage.id as TargetLanguage,
                rank,
                questionCount: selectedCount,
                isBot: opponent === 'bot',
                botId: opponent === 'bot' ? (selectedBotId || undefined) : undefined,
            })

            router.push(`/room/${matchId}`)
        } catch (err) {
            console.error('Failed to create room:', err)
            setIsCreating(false)
        }
    }

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
                <h1 className="text-lg font-bold text-[#333]">創建房間</h1>
            </header>

            <div className="flex-1 px-4 py-6 pb-28 space-y-6">
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
                                <span className="font-semibold text-[#333]">{lang.examName}</span>
                                <span className="text-xs text-[#64748b] block">{lang.name}</span>
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
                            <span className="font-semibold text-[#333]">PvE 對戰</span>
                            <span className="text-xs text-[#64748b]">大型語言模型</span>
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
                            <Users className="w-8 h-8 text-[#3b82f6]" />
                            <span className="font-semibold text-[#333]">PvP 對戰</span>
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
                        <h2 className="text-sm font-semibold text-[#64748b] mb-3">選擇 LLM</h2>
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
                                    <Avatar
                                        className="w-12 h-12"
                                        src={bot.image}
                                        fallback="🤖"
                                        alt={bot.name}
                                    />
                                    <span className="font-semibold text-[#333] text-xs truncate w-full text-center">
                                        {bot.name.replace(' Bot', '')}
                                    </span>
                                    <span className="text-[10px] text-[#64748b] truncate w-full text-center">
                                        {bot.botModel || 'LLM'}
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
                            <div className="flex items-center gap-2 justify-center w-full">
                                <p className="font-bold">
                                    {selectedLanguage.examName} {selectedLevel}
                                </p>
                                <span className="text-[#64748b]">－</span>
                                <p className="text-sm text-[#64748b]">
                                    {selectedCount}題
                                </p>
                                <span className="text-[#64748b]">－</span>
                                <p className="text-sm text-[#64748b]">
                                    {opponent === 'bot' ? 'PvE 對戰' : 'PvP 對戰'} [{opponent === 'bot' && botUsers.find((bot) => bot.id === selectedBotId)?.name.replace(' Bot', '')}]
                                </p>
                            </div>
                        </div>
                    </motion.section>
                )}
            </div>

            {/* Fixed Bottom Button */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] p-4 bg-linear-gradient-to-t from-[#F5F8FC] via-[#F5F8FC]/95 to-transparent">
                <motion.button
                    onClick={handleCreateRoom}
                    disabled={!isReady || isCreating}
                    className={`w-full py-4 text-lg font-semibold rounded-2xl transition-all ${isReady && !isCreating
                        ? 'bg-[#5B8BD4] text-white'
                        : 'bg-[#D5E3F7] text-[#64748b] cursor-not-allowed'
                        }`}
                    style={{ boxShadow: isReady && !isCreating ? '0 10px 25px -5px rgba(91, 139, 212, 0.4)' : 'none' }}
                    whileHover={isReady && !isCreating ? { scale: 1.02, backgroundColor: '#4A7BC4' } : {}}
                    whileTap={isReady && !isCreating ? { scale: 0.98 } : {}}
                >
                    {isCreating ? '創建中...' : '創建房間'}
                </motion.button>
            </div>
        </div>
    )
}
