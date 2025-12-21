import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams, useRouter } from 'next/navigation'
import { Avatar } from './components/Avatar'
import { ScoreBubble } from './components/ScoreBubble'
import { OptionCard } from './components/OptionCard'
import { startGame, submitAnswer } from '@/actions/game.server'
import { type GameSession, type ClientQuestion } from '@/types/game'
import { type TargetLanguage } from '@/generated/prisma'

const languageLabels: Record<string, string> = {
  ko: '韓文',
  ja: '日文',
  en: '英文',
  zh: '中文',
}

export function BattleScreen() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Settings from URL
  const langParam = (searchParams.get('lang') || 'ko') as TargetLanguage
  const levelParam = searchParams.get('level') || '1級'
  const countParam = parseInt(searchParams.get('count') || '10', 10)

  // Game State
  const [session, setSession] = useState<GameSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [playerScore, setPlayerScore] = useState(0)
  const [botScore, setBotScore] = useState(0)
  const [playerAnswering, setPlayerAnswering] = useState(false)
  const [botAnswering, setBotAnswering] = useState(false)
  const [botAnswer, setBotAnswer] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(15)
  const [timedOut, setTimedOut] = useState(false)

  // Initialization: Fetch from DB
  useEffect(() => {
    async function init() {
      try {
        setLoading(true)
        // Convert rank string "1級" -> 1
        const rankDigit = parseInt(levelParam.replace(/[^0-9]/g, '')) || 1
        const data = await startGame(null, { lang: langParam, rank: rankDigit })
        setSession(data)
      } catch (err: any) {
        console.error('Failed to start game:', err)
        setError(err.message || '無法取得題目，請檢查資料庫。')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [langParam, levelParam])

  // Current session data
  const currentQuestion = session?.questions[currentQuestionIndex] as ClientQuestion | undefined
  const totalQuestions = session?.questions.length || countParam

  const canProceed = showResult && (botAnswer !== null || timedOut)

  const handleTimeOut = useCallback(async () => {
    if (!showResult && !timedOut) {
      setTimedOut(true)
      setShowResult(true)
      if (!selectedAnswer) {
        setPlayerAnswering(false)
        if (session && currentQuestion) {
          try {
            const result = await submitAnswer(session.matchId, currentQuestion.id, "", null)
            setCorrectAnswer(result.correctAnswer)
          } catch (e) {
            console.error('Timeout fetch error:', e)
          }
        }
      }
    }
  }, [showResult, timedOut, selectedAnswer, session, currentQuestion])

  // Timer
  useEffect(() => {
    if (loading || error || !session) return
    if (timeLeft > 0 && !showResult) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !showResult) {
      handleTimeOut()
    }
  }, [timeLeft, showResult, handleTimeOut, loading, error, session])

  // Bot logic
  useEffect(() => {
    if (!session || !currentQuestion || botAnswer || showResult) return

    setBotAnswering(true)
    const delay = Math.random() * 6000 + 2000
    const timer = setTimeout(async () => {
      setBotAnswering(false)
      const options = Object.keys(currentQuestion.options)
      const answer = options[Math.floor(Math.random() * options.length)]
      setBotAnswer(answer)

      // Bot submit to server (userId is null)
      try {
        const result = await submitAnswer(session.matchId, currentQuestion.id, answer, null)
        setCorrectAnswer(result.correctAnswer)
        if (result.isCorrect) {
          setBotScore(prev => prev + result.newScore)
        }
      } catch (e) {
        console.error('Bot answer error:', e)
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [currentQuestionIndex, botAnswer, showResult, session, currentQuestion])

  useEffect(() => {
    if (botAnswer && (selectedAnswer || timedOut) && !showResult) {
      setShowResult(true)
    }
  }, [botAnswer, selectedAnswer, timedOut, showResult])

  const handleSelectAnswer = async (optionId: string) => {
    if (showResult || selectedAnswer || !session || !currentQuestion) return

    setPlayerAnswering(true)
    setSelectedAnswer(optionId)

    try {
      // Real submission to DB
      const result = await submitAnswer(session.matchId, currentQuestion.id, optionId, null)
      setCorrectAnswer(result.correctAnswer)

      if (result.isCorrect) {
        setPlayerScore(prev => prev + result.newScore)
      }
    } catch (err) {
      console.error('Submit answer error:', err)
    } finally {
      setPlayerAnswering(false)
      if (botAnswer || timedOut) {
        setShowResult(true)
      }
    }
  }

  const handleNextQuestion = () => {
    if (!canProceed) return

    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setCorrectAnswer(null)
      setShowResult(false)
      setBotAnswer(null)
      setBotAnswering(false)
      setTimeLeft(15)
      setTimedOut(false)
    } else {
      const params = new URLSearchParams({
        playerScore: playerScore.toString(),
        botScore: botScore.toString(),
        total: totalQuestions.toString(),
        lang: langParam,
        level: levelParam,
      })
      router.push(`/results?${params.toString()}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#5B8BD4] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#64748b] font-bold">載入對戰數據中...</p>
        </div>
      </div>
    )
  }

  if (error || !currentQuestion) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">😿</div>
          <p className="text-[#ef4444] font-bold mb-4">{error || '找不到題目'}</p>
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

  const getOptionState = (optionId: string): 'default' | 'selected' | 'correct' | 'incorrect' => {
    if (!showResult) {
      if (selectedAnswer === optionId) return 'selected'
      return 'default'
    }

    if (optionId === correctAnswer) return 'correct'
    if (selectedAnswer === optionId && optionId !== correctAnswer) return 'incorrect'
    return 'default'
  }

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      {/* Header - Language & Difficulty */}
      <header className="bg-white px-4 py-3 border-b-2 border-[#D5E3F7]">
        <motion.h1
          className="text-2xl font-bold text-center text-[#333]"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {languageLabels[langParam as string] || langParam} {levelParam}
        </motion.h1>
      </header>

      {/* Question Area */}
      <section className="bg-white px-4 py-6 border-b-2 border-[#D5E3F7]">
        {/* Progress & Timer */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[#5B8BD4]">Q{currentQuestionIndex + 1}</span>
            <span className="text-[#64748b] text-sm">/ {totalQuestions}</span>
          </div>
          <motion.div
            className={`px-3 py-1 rounded-full font-bold ${timeLeft <= 5 ? 'bg-[#fee2e2] text-[#ef4444]' : 'bg-[#D5E3F7] text-[#333]'
              }`}
            animate={timeLeft <= 5 && !showResult ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            {timeLeft}s
          </motion.div>
        </div>

        {/* Question Text */}
        <motion.p
          className="text-lg font-medium text-[#333] leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          key={currentQuestionIndex}
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
              disabled={showResult || selectedAnswer !== null}
              index={index}
              onClick={() => handleSelectAnswer(key)}
            />
          ))}
        </div>

        {/* Time Out Message */}
        <AnimatePresence>
          {timedOut && !selectedAnswer && (
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
          {showResult && (
            <motion.button
              onClick={handleNextQuestion}
              disabled={!canProceed}
              className={`w-full mt-4 py-3 text-lg font-semibold rounded-2xl transition-all ${canProceed
                ? 'bg-[#5B8BD4] text-white'
                : 'bg-[#D5E3F7] text-[#64748b] cursor-not-allowed'
                }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {!canProceed ? (
                '等待 AI 作答中...'
              ) : currentQuestionIndex < totalQuestions - 1 ? (
                '下一題'
              ) : (
                '查看結果'
              )}
            </motion.button>
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
            {playerAnswering && (
              <motion.span
                className="text-xs text-[#64748b]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                答題中...
              </motion.span>
            )}
            {showResult && selectedAnswer && (
              <motion.span
                className={`text-xs font-medium ${selectedAnswer === correctAnswer ? 'text-[#22c55e]' : 'text-[#ef4444]'
                  }`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                選擇: {selectedAnswer} {selectedAnswer === correctAnswer ? '✓' : '✗'}
              </motion.span>
            )}
            {showResult && !selectedAnswer && (
              <motion.span
                className="text-xs font-medium text-[#ef4444]"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                未作答 ✗
              </motion.span>
            )}
          </div>

          <ScoreBubble score={playerScore} direction="right" />

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

          <ScoreBubble score={botScore} direction="left" />

          <div className="flex flex-col gap-1">
            {botAnswering && (
              <motion.span
                className="text-xs text-[#64748b]"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                思考中...
              </motion.span>
            )}
            {botAnswer && (
              <motion.span
                className={`text-xs font-medium ${botAnswer === correctAnswer ? 'text-[#22c55e]' : 'text-[#ef4444]'
                  }`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                選擇: {botAnswer} {botAnswer === correctAnswer ? '✓' : '✗'}
              </motion.span>
            )}
          </div>
        </motion.div>
      </section>
    </div>
  )
}
