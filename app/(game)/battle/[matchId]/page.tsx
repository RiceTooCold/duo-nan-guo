'use client'

import { useEffect, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { Avatar } from '@/components/game/Avatar'
import { StatusBubble } from '@/components/game/StatusBubble'
import { BatteryScore } from '@/components/game/BatteryScore'
import { OptionCard } from '@/components/game/OptionCard'
import { BattleIntro } from '@/components/game/BattleIntro'
import { useGameClient } from '@/lib/game-engine/useGameClient'
import { GamePhase, type ClientQuestion } from '@/types/game'
import { rankToLevel } from '@/lib/config/game'
import { TargetLanguage } from '@/generated/prisma'

const languageLabels: Record<string, string> = {
    JP: '日文',
    EN: '英文',
    KR: '韓文',
    CN: '中文',
}

function BattleContent() {
    const params = useParams<{ matchId: string }>()
    const router = useRouter()

    // Get matchId from dynamic route param
    const matchId = params.matchId || ''

    // useGameClient now auto-detects selfPlayerId from session
    const {
        view,
        session: gameSession,
        isLoading,
        error: hookError,
        timeLeft,
        currentQuestion,
        selfAnswered,
        opponentAnswered,
        handleAnswer,
    } = useGameClient(matchId)

    // Derived state from view
    const totalQuestions = gameSession?.questions.length || 10
    const selfState = view?.self || null
    const opponentState = view?.opponent || null

    // Get language and rank from session (loaded from match)
    const langParam = gameSession?.targetLanguage || 'JP'
    const rankParam = gameSession?.rank || 1

    // --- TRANSITION LOGIC ---
    const showIntro = view?.phase === GamePhase.READY && (view?.currentQuestionIndex ?? 0) === 0
    const isRevealing = view?.phase === GamePhase.READY && (view?.currentQuestionIndex ?? 0) > 0

    // Navigate to results when game is finished
    useEffect(() => {
        if (view?.phase === GamePhase.FINISHED && matchId) {
            router.push(`/results/${matchId}`)
        }
    }, [view?.phase, matchId, router])

    // Determine option state for UI
    const getOptionState = (optionId: string): 'default' | 'selected' | 'correct' | 'incorrect' => {
        if (!view) return 'default'
        const isResolvingOrFinished = view.phase === GamePhase.RESOLVING || view.phase === GamePhase.FINISHED

        if (isResolvingOrFinished) {
            if (optionId === view.correctAnswer) return 'correct'
            if (view.self.answer === optionId && optionId !== view.correctAnswer) return 'incorrect'
            return 'default'
        }

        if (view.self.answer === optionId) {
            return view.self.isCorrect ? 'correct' : 'incorrect'
        }

        return 'default'
    }

    // Error state
    if (hookError) {
        let title = '😿';
        let message = hookError;
        const buttonText = '返回首頁';

        if (hookError === 'MATCH_FINISHED') {
            title = '🏁';
            message = '此對戰已結束';
        } else if (hookError === 'MATCH_EXPIRED') {
            title = '⏰';
            message = '對戰資料已過期';
        }

        return (
            <div className="min-h-dvh flex items-center justify-center bg-white p-6">
                <div className="text-center">
                    <div className="text-6xl mb-4">{title}</div>
                    <p className="text-[#ef4444] font-bold mb-4">{message}</p>
                    <button
                        onClick={() => router.push('/lobby')}
                        className="px-6 py-2 bg-[#5B8BD4] text-white rounded-xl font-bold"
                    >
                        {buttonText}
                    </button>
                </div>
            </div>
        )
    }

    // Loading state
    if (isLoading || !view) {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-white">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#5B8BD4] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-[#64748b] font-bold">載入對戰數據中...</p>
                </div>
            </div>
        )
    }

    // Data Integrity Error
    if (!currentQuestion) {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-white p-6">
                <div className="text-center">
                    <div className="text-6xl mb-4">🐛</div>
                    <p className="text-[#ef4444] font-bold mb-4">資料異常：找不到題目</p>
                    <p className="text-sm text-gray-500 mb-4">Phase: {view.phase}, QIndex: {view.currentQuestionIndex}</p>
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

    const isShowingResult = view.phase === GamePhase.RESOLVING
    const canProceed = isShowingResult && opponentAnswered

    return (
        <div
            key="battle-main"
            className="min-h-dvh flex flex-col bg-white relative"
        >
            <AnimatePresence>
                {showIntro && (
                    <BattleIntro
                        language={languageLabels[langParam as string] || (langParam as string)}
                        level={rankToLevel(langParam as TargetLanguage, rankParam as number)}
                        playerAvatar={selfState?.avatar}
                        opponentAvatar={opponentState?.avatar}
                        playerName={selfState?.name || 'You'}
                        opponentName={opponentState?.name || 'Opponent'}
                        onComplete={() => { }}
                    />
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="bg-white px-4 py-3 border-b-2 border-[#D5E3F7]">
                <motion.h1
                    className="text-2xl font-bold text-center text-[#333]"
                    animate={{ opacity: 1, y: 0 }}
                >
                    {languageLabels[langParam as string] || langParam} {rankToLevel(langParam as TargetLanguage, rankParam)}
                </motion.h1>
            </header>

            {/* Question Area */}
            <section className="bg-white px-4 py-6 border-b-2 border-[#D5E3F7]">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-[#5B8BD4]">Q{view.currentQuestionIndex + 1}</span>
                        <span className="text-[#64748b] text-sm">/ {totalQuestions}</span>
                    </div>
                    <motion.div
                        className={`px-3 py-1 rounded-full font-bold ${timeLeft <= 5 ? 'bg-[#fee2e2] text-[#ef4444]' : 'bg-[#D5E3F7] text-[#333]'
                            }`}
                        animate={timeLeft <= 5 && view.phase === GamePhase.PLAYING ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                    >
                        {timeLeft}s
                    </motion.div>
                </div>

                <div className="relative">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={`q-${view.currentQuestionIndex}`}
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
                            key={`q${view.currentQuestionIndex}-${key}`}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.15, duration: 0.3 }}
                        >
                            <OptionCard
                                id={key}
                                text={value as string}
                                state={getOptionState(key)}
                                disabled={isRevealing || isShowingResult || selfAnswered}
                                index={index}
                                onClick={() => handleAnswer(key)}
                                selfBadge={view.self.answer === key ? {
                                    avatar: selfState?.avatar,
                                    fallback: selfState?.name?.charAt(0) || '🦜'
                                } : null}
                                opponentBadge={isShowingResult && view.opponent.answer === key ? {
                                    avatar: opponentState?.avatar,
                                    fallback: opponentState?.isBot ? '🤖' : (opponentState?.name?.charAt(0) || 'O')
                                } : null}
                            />
                        </motion.div>
                    ))}
                </div>

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

            <div className="h-1 bg-[#D5E3F7]" />

            {/* Battle Area */}
            <section className="bg-[#D5E3F7] px-4 py-4 flex items-center justify-between gap-2">
                {/* Player (Left) */}
                <motion.div
                    className="flex items-center gap-3 relative"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="relative">
                        <Avatar
                            src={selfState?.avatar || '/mascot-parrot.jpg'}
                            alt={selfState?.name || 'Player'}
                            fallback={selfState?.name?.charAt(0) || '🦜'}
                            size="md"
                            badge="online"
                        />
                        <div className="absolute -top-8 -right-4 min-w-[80px]">
                            {view.phase === GamePhase.PLAYING && !selfAnswered && (
                                <StatusBubble text="等待作答..." variant="waiting" direction="left" />
                            )}
                            {(view.phase === GamePhase.PLAYING || view.phase === GamePhase.RESOLVING) && selfAnswered && (
                                <StatusBubble
                                    text={view.self.isCorrect ? '正確!' : '錯誤...'}
                                    variant={view.self.isCorrect ? 'correct' : 'incorrect'}
                                    direction="left"
                                />
                            )}
                            {view.phase === GamePhase.RESOLVING && !selfAnswered && (
                                <StatusBubble text="超時!" variant="timeout" direction="left" />
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-start gap-1">
                        <BatteryScore score={selfState?.score || 0} variant="default" />

                    </div>
                </motion.div>

                {/* Opponent (Right) */}
                <motion.div
                    className="flex items-center gap-3 flex-row-reverse relative"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="relative">
                        <Avatar
                            src={opponentState?.avatar || '/mascot-robot.jpg'}
                            alt={opponentState?.name || 'Bot'}
                            fallback={opponentState?.isBot ? '🤖' : opponentState?.name?.charAt(0) || 'O'}
                            size="md"
                            badge={opponentState?.isBot ? 'ai' : 'online'}
                        />
                        <div className="absolute -top-8 -left-2 min-w-[80px]">
                            {view.phase === GamePhase.PLAYING && !opponentAnswered && (
                                <StatusBubble text="思考中..." variant="thinking" direction="right" />
                            )}
                            {(view.phase === GamePhase.PLAYING || view.phase === GamePhase.RESOLVING) && opponentAnswered && (
                                <StatusBubble
                                    text={view.opponent.isCorrect ? '正確!' : '錯誤...'}
                                    variant={view.opponent.isCorrect ? 'correct' : 'incorrect'}
                                    direction="right"
                                />
                            )}
                            {view.phase === GamePhase.RESOLVING && !opponentAnswered && (
                                <StatusBubble text="超時!" variant="timeout" direction="right" />
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
