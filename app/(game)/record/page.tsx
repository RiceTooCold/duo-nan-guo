'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react'

// Mock data for a single game record
const mockGameDetail = {
    id: 1,
    date: '2024-01-15',
    language: 'ko',
    languageName: '韓文',
    difficulty: '1級',
    score: 850,
    totalQuestions: 10,
    correctAnswers: 8,
    duration: '3:42',
    questions: [
        { id: 1, text: '다음 중 "안녕하세요"의 의미로 가장 적절한 것은?', playerAnswer: 'B', correctAnswer: 'B', isCorrect: true },
        { id: 2, text: '"감사합니다"는 무슨 뜻입니까?', playerAnswer: 'C', correctAnswer: 'C', isCorrect: true },
        { id: 3, text: '"사랑해요"의 의미는?', playerAnswer: 'A', correctAnswer: 'A', isCorrect: true },
        { id: 4, text: '"미안합니다"는 어떤 의미입니까?', playerAnswer: 'B', correctAnswer: 'D', isCorrect: false },
        { id: 5, text: '"잘 자요"의 뜻은?', playerAnswer: 'A', correctAnswer: 'A', isCorrect: true },
        { id: 6, text: '"배고파요"는 무슨 뜻입니까?', playerAnswer: 'C', correctAnswer: 'C', isCorrect: true },
        { id: 7, text: '"좋아요"의 의미는?', playerAnswer: 'A', correctAnswer: 'B', isCorrect: false },
        { id: 8, text: '"예쁘다"는 어떤 의미입니까?', playerAnswer: 'D', correctAnswer: 'D', isCorrect: true },
        { id: 9, text: '"맛있어요"의 뜻은?', playerAnswer: 'B', correctAnswer: 'B', isCorrect: true },
        { id: 10, text: '"재미있어요"는 무슨 뜻입니까?', playerAnswer: 'A', correctAnswer: 'A', isCorrect: true },
    ],
}

export default function RecordPage() {
    const accuracy = Math.round((mockGameDetail.correctAnswers / mockGameDetail.totalQuestions) * 100)

    return (
        <div className="min-h-dvh flex flex-col bg-[#F5F8FC]">
            {/* Header */}
            <header className="px-4 py-4 border-b-2 border-[#D5E3F7] flex items-center gap-4 bg-white">
                <Link
                    href="/profile"
                    className="p-2 -ml-2 rounded-full hover:bg-[#D5E3F7] transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-[#333]" />
                </Link>
                <h1 className="text-lg font-bold text-[#333]">遊戲紀錄詳情</h1>
            </header>

            <div className="flex-1 px-4 py-6 space-y-4 overflow-y-auto">
                {/* Summary Card */}
                <motion.div
                    className="bg-white rounded-2xl border-2 border-[#D5E3F7] p-5"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🇰🇷</span>
                            <div>
                                <h2 className="font-bold text-[#333]">{mockGameDetail.languageName} {mockGameDetail.difficulty}</h2>
                                <p className="text-sm text-[#64748b]">{mockGameDetail.date}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-[#5B8BD4]">{mockGameDetail.score}</p>
                            <p className="text-xs text-[#64748b]">分數</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-[#dcfce7] rounded-xl p-3 text-center">
                            <p className="text-xl font-bold text-[#22c55e]">{mockGameDetail.correctAnswers}</p>
                            <p className="text-xs text-[#22c55e]">答對</p>
                        </div>
                        <div className="bg-[#fee2e2] rounded-xl p-3 text-center">
                            <p className="text-xl font-bold text-[#ef4444]">{mockGameDetail.totalQuestions - mockGameDetail.correctAnswers}</p>
                            <p className="text-xs text-[#ef4444]">答錯</p>
                        </div>
                        <div className="bg-[#D5E3F7] rounded-xl p-3 text-center">
                            <p className="text-xl font-bold text-[#5B8BD4]">{accuracy}%</p>
                            <p className="text-xs text-[#5B8BD4]">準確率</p>
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center justify-center gap-2 mt-4 text-[#64748b]">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">遊戲時長：{mockGameDetail.duration}</span>
                    </div>
                </motion.div>

                {/* Questions List */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-[#64748b] px-1">答題記錄</h3>

                    {mockGameDetail.questions.map((q, index) => (
                        <motion.div
                            key={q.id}
                            className={`bg-white rounded-2xl border-2 p-4 ${q.isCorrect ? 'border-[#22c55e]/30' : 'border-[#ef4444]/30'
                                }`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <div className="flex items-start gap-3">
                                {/* Status Icon */}
                                <div className={`mt-0.5 ${q.isCorrect ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                                    {q.isCorrect ? (
                                        <CheckCircle className="w-5 h-5" />
                                    ) : (
                                        <XCircle className="w-5 h-5" />
                                    )}
                                </div>

                                {/* Question Content */}
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-[#333] mb-2">
                                        <span className="text-[#5B8BD4] font-bold">Q{q.id}.</span> {q.text}
                                    </p>

                                    <div className="flex items-center gap-4 text-xs">
                                        <span className={`px-2 py-1 rounded-lg ${q.isCorrect
                                                ? 'bg-[#dcfce7] text-[#22c55e]'
                                                : 'bg-[#fee2e2] text-[#ef4444]'
                                            }`}>
                                            你的答案：{q.playerAnswer}
                                        </span>
                                        {!q.isCorrect && (
                                            <span className="px-2 py-1 rounded-lg bg-[#dcfce7] text-[#22c55e]">
                                                正確答案：{q.correctAnswer}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Bottom Button */}
            <div className="p-4 bg-white border-t-2 border-[#D5E3F7]">
                <Link href="/room">
                    <motion.button
                        className="w-full py-4 text-lg font-semibold rounded-2xl bg-[#5B8BD4] text-white"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        再玩一局
                    </motion.button>
                </Link>
            </div>
        </div>
    )
}
