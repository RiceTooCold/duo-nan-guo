'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { Avatar } from './components/Avatar'
import { ScoreBubble } from './components/ScoreBubble'
import { OptionCard } from './components/OptionCard'

// Mock questions for different languages
const mockQuestions: Record<string, Array<{
  id: number
  text: string
  options: Array<{ id: string; text: string }>
  correctAnswer: string
}>> = {
  ko: [
    { id: 1, text: '다음 중 "안녕하세요"의 의미로 가장 적절한 것은?', options: [{ id: 'A', text: '再見' }, { id: 'B', text: '你好' }, { id: 'C', text: '謝謝' }, { id: 'D', text: '對不起' }], correctAnswer: 'B' },
    { id: 2, text: '"감사합니다"는 무슨 뜻입니까?', options: [{ id: 'A', text: '對不起' }, { id: 'B', text: '再見' }, { id: 'C', text: '謝謝' }, { id: 'D', text: '你好' }], correctAnswer: 'C' },
    { id: 3, text: '"사랑해요"의 의미는?', options: [{ id: 'A', text: '我愛你' }, { id: 'B', text: '我恨你' }, { id: 'C', text: '我想你' }, { id: 'D', text: '我需要你' }], correctAnswer: 'A' },
  ],
  ja: [
    { id: 1, text: '「おはようございます」の意味は？', options: [{ id: 'A', text: '晚安' }, { id: 'B', text: '早安' }, { id: 'C', text: '午安' }, { id: 'D', text: '你好' }], correctAnswer: 'B' },
    { id: 2, text: '「ありがとう」は何という意味ですか？', options: [{ id: 'A', text: '對不起' }, { id: 'B', text: '再見' }, { id: 'C', text: '謝謝' }, { id: 'D', text: '請' }], correctAnswer: 'C' },
    { id: 3, text: '「さようなら」の意味は？', options: [{ id: 'A', text: '你好' }, { id: 'B', text: '謝謝' }, { id: 'C', text: '對不起' }, { id: 'D', text: '再見' }], correctAnswer: 'D' },
  ],
  en: [
    { id: 1, text: 'What does "Hello" mean?', options: [{ id: 'A', text: '再見' }, { id: 'B', text: '你好' }, { id: 'C', text: '謝謝' }, { id: 'D', text: '對不起' }], correctAnswer: 'B' },
    { id: 2, text: 'What is the meaning of "Thank you"?', options: [{ id: 'A', text: '對不起' }, { id: 'B', text: '再見' }, { id: 'C', text: '謝謝' }, { id: 'D', text: '你好' }], correctAnswer: 'C' },
    { id: 3, text: 'What does "Goodbye" mean?', options: [{ id: 'A', text: '你好' }, { id: 'B', text: '謝謝' }, { id: 'C', text: '對不起' }, { id: 'D', text: '再見' }], correctAnswer: 'D' },
  ],
  zh: [
    { id: 1, text: '「你好」的英文是什麼？', options: [{ id: 'A', text: 'Goodbye' }, { id: 'B', text: 'Hello' }, { id: 'C', text: 'Thank you' }, { id: 'D', text: 'Sorry' }], correctAnswer: 'B' },
    { id: 2, text: '「謝謝」的日文是什麼？', options: [{ id: 'A', text: 'すみません' }, { id: 'B', text: 'さようなら' }, { id: 'C', text: 'ありがとう' }, { id: 'D', text: 'こんにちは' }], correctAnswer: 'C' },
    { id: 3, text: '「再見」的韓文是什麼？', options: [{ id: 'A', text: '안녕하세요' }, { id: 'B', text: '감사합니다' }, { id: 'C', text: '미안합니다' }, { id: 'D', text: '안녕히 가세요' }], correctAnswer: 'D' },
  ],
}

const languageLabels: Record<string, string> = {
  ko: '韓文',
  ja: '日文',
  en: '英文',
  zh: '中文',
}

export function BattleScreen() {
  const searchParams = useSearchParams()
  
  // Get settings from URL params (passed from room page)
  const language = searchParams.get('lang') || 'ko'
  const level = searchParams.get('level') || '1級'
  const totalQuestions = parseInt(searchParams.get('count') || '10', 10)

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [playerScore, setPlayerScore] = useState(0)  // Start from 0
  const [botScore, setBotScore] = useState(0)        // Start from 0
  const [playerAnswering, setPlayerAnswering] = useState(false)
  const [botAnswering, setBotAnswering] = useState(false)
  const [botAnswer, setBotAnswer] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(15)
  const [timedOut, setTimedOut] = useState(false)

  // Get questions for current language
  const questions = mockQuestions[language] || mockQuestions.ko
  const currentQuestion = questions[currentQuestionIndex % questions.length]

  // Check if can proceed to next question (both answered or timed out)
  const canProceed = showResult && (botAnswer !== null || timedOut)

  // Handle time out - auto reveal answer
  const handleTimeOut = useCallback(() => {
    if (!showResult && !timedOut) {
      setTimedOut(true)
      setShowResult(true)
      // If player didn't answer, mark as no answer
      if (!selectedAnswer) {
        setPlayerAnswering(false)
      }
    }
  }, [showResult, timedOut, selectedAnswer])

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && !showResult) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !showResult) {
      handleTimeOut()
    }
  }, [timeLeft, showResult, handleTimeOut])

  // Simulate bot answering (bot answers independently of player)
  useEffect(() => {
    if (!botAnswer && !showResult) {
      setBotAnswering(true)
      // Bot takes 2-8 seconds to answer
      const delay = Math.random() * 6000 + 2000
      const timer = setTimeout(() => {
        setBotAnswering(false)
        const answer = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]
        setBotAnswer(answer)
        // Add score if bot is correct
        if (answer === currentQuestion.correctAnswer) {
          setBotScore(prev => prev + 100)
        }
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [currentQuestionIndex, botAnswer, showResult, currentQuestion.correctAnswer])

  // When bot finishes and player already answered, ensure showResult is true
  useEffect(() => {
    if (botAnswer && selectedAnswer && !showResult) {
      setShowResult(true)
    }
  }, [botAnswer, selectedAnswer, showResult])

  const handleSelectAnswer = (optionId: string) => {
    if (showResult || selectedAnswer) return
    
    setPlayerAnswering(true)
    setSelectedAnswer(optionId)
    
    setTimeout(() => {
      setPlayerAnswering(false)
      
      // Add score if player is correct
      if (optionId === currentQuestion.correctAnswer) {
        setPlayerScore(prev => prev + 100)
      }
      
      // Only show result if bot has also answered
      if (botAnswer) {
        setShowResult(true)
      }
    }, 500)
  }

  const handleNextQuestion = () => {
    if (!canProceed) return
    
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setShowResult(false)
      setBotAnswer(null)
      setBotAnswering(false)
      setTimeLeft(15)
      setTimedOut(false)
    } else {
      // Navigate to results with scores
      const params = new URLSearchParams({
        playerScore: playerScore.toString(),
        botScore: botScore.toString(),
        total: totalQuestions.toString(),
        lang: language,
        level: level,
      })
      window.location.href = `/results?${params.toString()}`
    }
  }

  const getOptionState = (optionId: string): 'default' | 'selected' | 'correct' | 'incorrect' => {
    if (!showResult) {
      if (selectedAnswer === optionId) return 'selected'
      return 'default'
    }
    
    if (optionId === currentQuestion.correctAnswer) return 'correct'
    if (selectedAnswer === optionId && optionId !== currentQuestion.correctAnswer) return 'incorrect'
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
          {languageLabels[language]} {level}
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
            className={`px-3 py-1 rounded-full font-bold ${
              timeLeft <= 5 ? 'bg-[#fee2e2] text-[#ef4444]' : 'bg-[#D5E3F7] text-[#333]'
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
          {currentQuestion.text}
        </motion.p>
      </section>

      {/* Options Grid */}
      <section className="bg-white px-4 py-4 flex-1">
        <div className="grid grid-cols-2 gap-3">
          {currentQuestion.options.map((option, index) => (
            <OptionCard
              key={option.id}
              id={option.id}
              text={option.text}
              state={getOptionState(option.id)}
              disabled={showResult || selectedAnswer !== null}
              index={index}
              onClick={() => handleSelectAnswer(option.id)}
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
              className={`w-full mt-4 py-3 text-lg font-semibold rounded-2xl transition-all ${
                canProceed 
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
                className={`text-xs font-medium ${
                  selectedAnswer === currentQuestion.correctAnswer ? 'text-[#22c55e]' : 'text-[#ef4444]'
                }`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                選擇: {selectedAnswer} {selectedAnswer === currentQuestion.correctAnswer ? '✓' : '✗'}
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
                className={`text-xs font-medium ${
                  botAnswer === currentQuestion.correctAnswer ? 'text-[#22c55e]' : 'text-[#ef4444]'
                }`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                選擇: {botAnswer} {botAnswer === currentQuestion.correctAnswer ? '✓' : '✗'}
              </motion.span>
            )}
          </div>
        </motion.div>
      </section>
    </div>
  )
}
