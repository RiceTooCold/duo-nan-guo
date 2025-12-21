'use client'

import { useEffect, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams, useRouter } from 'next/navigation'
import { Avatar } from '@/components/game/Avatar'
import { ScoreBubble } from '@/components/game/ScoreBubble'
import { OptionCard } from '@/components/game/OptionCard'
import { CountdownOverlay } from '@/components/game/CountdownOverlay'
import { useGameLoop } from '@/lib/game-engine/useGameLoop'
import { useBot } from '@/lib/game-engine/useBot'
import { GamePhase, type ClientQuestion } from '@/types/game'
import { type TargetLanguage } from '@/generated/prisma'
import { rankToLevel } from '@/lib/config/game'

const languageLabels: Record<string, string> = {
  JP: '日文',
  EN: '英文',
  KR: '韓文',
  CN: '中文',
}

function BattleContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Settings from URL
  const langParam = (searchParams.get('lang') || 'JP') as TargetLanguage
  const rankParam = parseInt(searchParams.get('rank') || '1', 10)
  const countParam = parseInt(searchParams.get('count') || '10', 10)

  // Use the game loop hook
  const { state, initGame, handleAnswer, handleBotAnswer } = useGameLoop()

  // Derived state
  const currentQuestion = state.session?.questions[state.currentQuestionIndex] as ClientQuestion | undefined
  const totalQuestions = state.session?.questions.length || countParam
  const playerState = state.players['player_1']
  const botState = state.players['bot_1']

  // Use the bot hook
  useBot({
    phase: state.phase,
    currentQuestion,
    onAnswer: handleBotAnswer,
    isEnabled: true,
  })

  // Initialize game on mount
  useEffect(() => {
    initGame(null, { lang: langParam, rank: rankParam })
  }, [langParam, rankParam, initGame])

  // Navigate to results when game is finished
  useEffect(() => {
    if (state.phase === GamePhase.FINISHED) {
      const levelLabel = rankToLevel(langParam, rankParam)
      const params = new URLSearchParams({
        playerScore: (playerState?.score || 0).toString(),
        botScore: (botState?.score || 0).toString(),
        total: totalQuestions.toString(),
        lang: langParam,
        level: levelLabel,
        winner: state.winnerId || '',
      })
      router.push(`/results?${params.toString()}`)
    }
  }, [state.phase, state.winnerId, playerState, botState, totalQuestions, langParam, rankParam, router])

  // Determine option state for UI
  const getOptionState = (optionId: string): 'default' | 'selected' | 'correct' | 'incorrect' => {
    if (state.phase !== GamePhase.RESOLVING && state.phase !== GamePhase.FINISHED) {
      if (state.playerAnswer === optionId) return 'selected'
      return 'default'
    }

    if (optionId === state.correctAnswer) return 'correct'
    if (state.playerAnswer === optionId && optionId !== state.correctAnswer) return 'incorrect'
    return 'default'
  }

  // Show countdown overlay during COUNTDOWN phase
  const showCountdown = state.phase === GamePhase.COUNTDOWN

  // Loading state
  if (state.phase === GamePhase.IDLE || !currentQuestion) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#5B8BD4] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#64748b] font-bold">載入對戰數據中...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (state.error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">😿</div>
          <p className="text-[#ef4444] font-bold mb-4">{state.error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-[#5B8BD4] text-white rounded-xl font-bold"
          >
            返回首頁
          </button>
        </div>
      </div>
    )
  }

  const isShowingResult = state.phase === GamePhase.RESOLVING
  const canProceed = isShowingResult && state.botAnswer !== null

  return (
    <div className="min-h-dvh flex flex-col bg-white relative">
      {/* Countdown Overlay */}
      <CountdownOverlay isVisible={showCountdown} number={state.timeLeft} />

      {/* Header - Language & Difficulty */}
      <header className="bg-white px-4 py-3 border-b-2 border-[#D5E3F7]">
        <motion.h1
          className="text-2xl font-bold text-center text-[#333]"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {languageLabels[langParam as string] || langParam} {rankToLevel(langParam, rankParam)}
        </motion.h1>
      </header>

      {/* Question Area */}
      <section className="bg-white px-4 py-6 border-b-2 border-[#D5E3F7]">
        {/* Progress & Timer */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[#5B8BD4]">Q{state.currentQuestionIndex + 1}</span>
            <span className="text-[#64748b] text-sm">/ {totalQuestions}</span>
          </div>
          <motion.div
            className={`px-3 py-1 rounded-full font-bold ${state.timeLeft <= 5 ? 'bg-[#fee2e2] text-[#ef4444]' : 'bg-[#D5E3F7] text-[#333]'
              }`}
            animate={state.timeLeft <= 5 && state.phase === GamePhase.PLAYING ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            {state.timeLeft}s
          </motion.div>
        </div>

        {/* Question Text */}
        <motion.p
          className="text-lg font-medium text-[#333] leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          key={state.currentQuestionIndex}
        >
          {currentQuestion.stimulus}
        </motion.p>
      </section>

      {/* Options Grid */}
      <section className="bg-white px-4 py-4 flex-1">
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(currentQuestion.options).map(([key, value], index) => (
            <OptionCard
              key={key}
              id={key}
              text={value as string}
              state={getOptionState(key)}
              disabled={isShowingResult || state.playerAnswer !== null}
              index={index}
              onClick={() => handleAnswer(key)}
            />
          ))}
        </div>

        {/* Time Out Message */}
        <AnimatePresence>
          {isShowingResult && !state.playerAnswer && (
            <motion.div
              className="mt-4 p-3 bg-[#fee2e2] rounded-xl text-center text-[#ef4444] font-medium"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              ⏰ 時間到！此題未作答
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next Button - Only show when both have answered */}
        <AnimatePresence>
          {isShowingResult && (
            <motion.div
              className="mt-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {!canProceed && (
                <p className="text-[#64748b] animate-pulse">等待 AI 作答中...</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Battle Area - Divider */}
      <div className="h-1 bg-[#D5E3F7]" />

      {/* Battle Area - Player vs Bot */}
      <section className="bg-[#D5E3F7] px-4 py-6 flex flex-col gap-4">
        {/* Player (Top - Right aligned) */}
        <motion.div
          className="flex items-center justify-end gap-3"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="flex flex-col items-end gap-1">
            {state.phase === GamePhase.PLAYING && state.playerAnswer === null && (
              <motion.span
                className="text-xs text-[#64748b]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                等待作答...
              </motion.span>
            )}
            {isShowingResult && state.playerAnswer && (
              <motion.span
                className={`text-xs font-medium ${state.playerAnswer === state.correctAnswer ? 'text-[#22c55e]' : 'text-[#ef4444]'
                  }`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                選擇: {state.playerAnswer} {state.playerAnswer === state.correctAnswer ? '✓' : '✗'}
              </motion.span>
            )}
            {isShowingResult && !state.playerAnswer && (
              <motion.span
                className="text-xs font-medium text-[#ef4444]"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                未作答 ✗
              </motion.span>
            )}
          </div>

          <ScoreBubble score={playerState?.score || 0} direction="right" />

          <Avatar
            src="/mascot-parrot.png"
            alt="Player Parrot"
            fallback="🦜"
            size="md"
            badge="online"
          />
        </motion.div>

        {/* VS Divider */}
        <div className="flex items-center justify-center">
          <span className="px-4 py-1 bg-white rounded-full text-sm font-bold text-[#5B8BD4] shadow">
            VS
          </span>
        </div>

        {/* Bot (Bottom - Left aligned) */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Avatar
            src="/mascot-robot.png"
            alt="Bot Robot"
            fallback="🤖"
            size="md"
            badge="ai"
          />

          <ScoreBubble score={botState?.score || 0} direction="left" />

          <div className="flex flex-col gap-1">
            {state.phase === GamePhase.PLAYING && state.botAnswer === null && (
              <motion.span
                className="text-xs text-[#64748b]"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                思考中...
              </motion.span>
            )}
            {state.botAnswer && (
              <motion.span
                className={`text-xs font-medium ${state.botAnswer === state.correctAnswer ? 'text-[#22c55e]' : 'text-[#ef4444]'
                  }`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                選擇: {state.botAnswer} {state.botAnswer === state.correctAnswer ? '✓' : '✗'}
              </motion.span>
            )}
          </div>
        </motion.div>
      </section>
    </div>
  )
}

export default function BattlePage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#5B8BD4] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#64748b] font-bold">載入中...</p>
        </div>
      </div>
    }>
      <BattleContent />
    </Suspense>
  )
}
