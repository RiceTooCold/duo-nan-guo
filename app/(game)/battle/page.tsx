'use client'

import { useEffect, Suspense, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams, useRouter } from 'next/navigation'
import { Avatar } from '@/components/game/Avatar'
import { StatusBubble } from '@/components/game/StatusBubble'
import { ScoreBubble } from '@/components/game/ScoreBubble'
import { BatteryScore } from '@/components/game/BatteryScore'
import { OptionCard } from '@/components/game/OptionCard'
import { BattleIntro } from '@/components/game/BattleIntro'
import { useGameLoop } from '@/lib/game-engine/useGameLoop'
import { useBot } from '@/lib/game-engine/useBot'
import { useGameResultStore } from '@/lib/game-engine/useGameResultStore'
import { GamePhase, type ClientQuestion } from '@/types/game'
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

  // Get matchId from URL (set by RoomPage after creating match)
  const matchId = searchParams.get('matchId')

  // Use the game loop hook
  const { state, initGame, startRound, handleAnswer, handleBotAnswer } = useGameLoop()

  // Derived state
  const currentQuestion = state.session?.questions[state.currentQuestionIndex] as ClientQuestion | undefined
  const totalQuestions = state.session?.questions.length || 10
  const selfState = state.self
  const opponentState = state.opponent

  // Get language and rank from session (loaded from match)
  const langParam = state.session?.targetLanguage || 'JP'
  const rankParam = state.session?.rank || 1

  // Use the bot hook
  useBot({
    phase: state.phase,
    currentQuestion,
    onAnswer: handleBotAnswer,
    isEnabled: true,
  })

  // --- TRANSITION LOGIC (Inlined) ---
  const showIntro = state.phase === GamePhase.READY && state.currentQuestionIndex === 0
  const isRevealing = state.phase === GamePhase.READY && state.currentQuestionIndex > 0

  // Auto-start round after Reveal animation (1.5s delay) for Q2+
  useEffect(() => {
    if (isRevealing) {
      const timer = setTimeout(() => {
        startRound();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isRevealing, startRound]);
  // ----------------------------------




  // Initialize game on mount using matchId
  useEffect(() => {
    if (matchId) {
      initGame(matchId)
    }
  }, [matchId, initGame])

  // Get setResult from store
  const setResult = useGameResultStore((s) => s.setResult)

  // Navigate to results when game is finished
  useEffect(() => {
    if (state.phase === GamePhase.FINISHED && state.session) {
      const levelLabel = rankToLevel(langParam as any, rankParam)
      const playerScore = selfState?.score || 0
      const botScore = opponentState?.score || 0

      // Calculate correct answers (score / 10 since each correct = 10 points)
      const correctAnswers = Math.floor(playerScore / 10)
      const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

      // Store result in Zustand for instant display
      setResult({
        matchId: state.session.matchId,
        isWin: state.winnerId === 'self',
        playerScore,
        botScore,
        correctAnswers,
        totalQuestions,
        accuracy,
        maxCombo: selfState?.maxStreak || 0, // Use maxStreak tracked during game
        language: langParam,
        level: levelLabel,
        playerName: selfState?.name || 'You',
        botName: opponentState?.name || 'AI Bot',
        playerAvatar: selfState?.avatar,
        botAvatar: opponentState?.avatar,
      })

      router.push('/battle/results')
    }
  }, [state.phase, state.winnerId, state.session, selfState, opponentState, totalQuestions, langParam, rankParam, router, setResult])

  // Determine option state for UI
  const getOptionState = (optionId: string): 'default' | 'selected' | 'correct' | 'incorrect' => {
    if (state.phase !== GamePhase.RESOLVING && state.phase !== GamePhase.FINISHED) {
      if (state.selfAnswer === optionId) return 'selected'
      return 'default'
    }

    if (optionId === state.correctAnswer) return 'correct'
    if (state.selfAnswer === optionId && optionId !== state.correctAnswer) return 'incorrect'
    return 'default'
  }



  // Error state
  if (state.error) {
    let title = '😿';
    let message = state.error;
    let buttonText = '返回首頁';

    if (state.error === 'MATCH_FINISHED') {
      title = '🏁';
      message = '此對戰已結束';
    } else if (state.error === 'MATCH_EXPIRED') {
      title = '⏰';
      message = '對戰資料已過期';
    }

    return (
      <div className="min-h-dvh flex items-center justify-center bg-white p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">{title}</div>
          <p className="text-[#ef4444] font-bold mb-4">{message}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-[#5B8BD4] text-white rounded-xl font-bold"
          >
            {buttonText}
          </button>
        </div>
      </div>
    )
  }

  // Loading state (IDLE or IDLE->READY transition)
  if (state.phase === GamePhase.IDLE) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#5B8BD4] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#64748b] font-bold">載入對戰數據中...</p>
        </div>
      </div>
    )
  }

  // Data Integrity Error (Loaded but no question)
  if (!currentQuestion) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🐛</div>
          <p className="text-[#ef4444] font-bold mb-4">資料異常：找不到題目</p>
          <p className="text-sm text-gray-500 mb-4">Phase: {state.phase}, QIndex: {state.currentQuestionIndex}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#5B8BD4] text-white rounded-xl font-bold"
          >
            重新整理
          </button>
        </div>
      </div>
    )
  }



  const isShowingResult = state.phase === GamePhase.RESOLVING
  const canProceed = isShowingResult && state.opponentAnswered

  return (
    <div
      key="battle-main"
      className="min-h-dvh flex flex-col bg-white relative"
    >
      <AnimatePresence>
        {showIntro && (
          <BattleIntro
            language={languageLabels[langParam as string] || (langParam as string)}
            level={rankToLevel(langParam as any, rankParam as number)}
            playerAvatar={selfState?.avatar}
            opponentAvatar={opponentState?.avatar}
            playerName={selfState?.name || 'You'}
            opponentName={opponentState?.name || 'Opponent'}
            onComplete={startRound}
          />
        )}
      </AnimatePresence>

      {/* Header - Language & Difficulty */}
      <header className="bg-white px-4 py-3 border-b-2 border-[#D5E3F7]">
        <motion.h1
          className="text-2xl font-bold text-center text-[#333]"
          animate={{ opacity: 1, y: 0 }}
        >
          {languageLabels[langParam as string] || langParam} {rankToLevel(langParam as any, rankParam)}
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

        {/* Question Text - simple key to avoid re-render on phase change */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.p
              key={`q-${state.currentQuestionIndex}`}
              className="text-lg font-medium text-[#333] leading-relaxed"
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {currentQuestion.stimulus}
            </motion.p>
          </AnimatePresence>
        </div>
      </section>

      {/* Options Grid */}
      <section className="bg-white px-4 py-4 flex-1">
        <div className="grid grid-cols-1 gap-3">
          {Object.entries(currentQuestion.options).map(([key, value], index) => (
            <motion.div
              key={`q${state.currentQuestionIndex}-${key}`}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15, duration: 0.3 }}
            >
              <OptionCard
                id={key}
                text={value as string}
                state={getOptionState(key)}
                disabled={isRevealing || isShowingResult || state.selfAnswered}
                index={index}
                onClick={() => handleAnswer(key)}
              />
            </motion.div>
          ))}
        </div>

        {/* Next Button - Only show when both have answered */}
        <AnimatePresence>
          {isShowingResult && (
            <motion.div
              className="mt-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Battle Area - Divider */}
      <div className="h-1 bg-[#D5E3F7]" />

      {/* Battle Area - Player vs Opponent */}
      {/* Battle Area - Player (Left) vs Opponent (Right) */}
      {/* Battle Area - Player (Left) vs Opponent (Right) */}
      <section className="bg-[#D5E3F7] px-4 py-4 flex items-center justify-between gap-2">
        {/* Player (Left) */}
        <motion.div
          className="flex items-center gap-3 relative"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="relative">
            <Avatar
              src="/mascot-parrot.jpg"
              alt="Player Parrot"
              fallback="🦜"
              size="md"
              badge="online"
            />
            {/* Status Bubbles for Player */}
            <div className="absolute -top-8 -right-4 min-w-[80px]">
              {state.phase === GamePhase.PLAYING && !state.selfAnswered && (
                <StatusBubble text="等待作答..." variant="waiting" direction="left" />
              )}
              {state.phase === GamePhase.PLAYING && state.selfAnswered && !state.opponentAnswered && (
                <StatusBubble text="等待對手..." variant="thinking" direction="left" />
              )}
              {isShowingResult && state.selfAnswer && (
                <StatusBubble
                  text={state.selfAnswer === state.correctAnswer ? '正確!' : '錯誤...'}
                  variant={state.selfAnswer === state.correctAnswer ? 'correct' : 'incorrect'}
                  direction="left"
                />
              )}
            </div>
          </div>

          <div className="flex flex-col items-start gap-1">
            <BatteryScore score={selfState?.score || 0} variant="default" />
          </div>
        </motion.div>

        {/* Bot (Right) */}
        <motion.div
          className="flex items-center gap-3 flex-row-reverse relative"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="relative">
            <Avatar
              src="/mascot-robot.jpg"
              alt="Bot Robot"
              fallback="🤖"
              size="md"
              badge="ai"
            />
            {/* Status Bubbles for Bot */}
            <div className="absolute -top-8 -left-2 min-w-[80px]">
              {state.phase === GamePhase.PLAYING && !state.opponentAnswered && (
                <StatusBubble text="思考中..." variant="thinking" direction="right" />
              )}
              {state.phase === GamePhase.PLAYING && state.opponentAnswered && (
                <StatusBubble text="已作答" variant="default" direction="right" />
              )}
              {isShowingResult && (
                <StatusBubble
                  text={state.opponentAnswer === state.correctAnswer ? '正確!' : '錯誤...'}
                  variant={state.opponentAnswer === state.correctAnswer ? 'correct' : 'incorrect'}
                  direction="right"
                />
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <BatteryScore score={opponentState?.score || 0} variant="opponent" />
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
