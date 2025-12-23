'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { CheckCircle2, Users, X } from 'lucide-react'
import { Avatar } from '@/components/game/Avatar'
import { CountdownOverlay } from '@/components/game/CountdownOverlay'
import {
    getMatchInfo,
    triggerBotJoin,
    startWaitingMatch,
    leaveWaitingMatch,
    hostStartGame
} from '@/actions/game.server'
import { getPusherClient, getRoomChannel, ROOM_EVENTS } from '@/lib/pusher'
import { rankToLevel } from '@/lib/config/game'
import type { MatchStatus, TargetLanguage } from '@prisma/client'

interface MatchPlayer {
    userId: string | null
    playerId: string
    name: string
    avatar: string | null
    isBot: boolean
    botModel?: string | null
    finalScore: number
}

interface MatchInfo {
    id: string
    targetLanguage: TargetLanguage
    rank: number
    questionCount: number
    status: MatchStatus
    players: MatchPlayer[]
    isBot: boolean
}

const languageTestNames: Record<TargetLanguage, string> = {
    JP: '日文',
    EN: '英文',
    KR: '韓文',
    CN: '中文',
}

export default function WaitingRoomPage() {
    const params = useParams<{ matchId: string }>()
    const matchId = params.matchId
    const router = useRouter()
    const { data: session } = useSession()

    const [match, setMatch] = useState<MatchInfo | null>(null)
    const [status, setStatus] = useState<'loading' | 'waiting' | 'starting' | 'leaving' | 'error'>('loading')
    const [countdown, setCountdown] = useState(3)
    const [showCountdown, setShowCountdown] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const isLeavingRef = useRef(false)

    const isHost = match?.players[0]?.userId === session?.user?.id
    const hasGuest = (match?.players?.length ?? 0) >= 2
    const myPlayer = match?.players.find(p => p.userId === session?.user?.id)
    const opponentPlayer = match?.players.find(p => p.userId !== session?.user?.id)

    // Start countdown and navigate to battle
    const startCountdown = useCallback(async () => {
        setStatus('starting')
        setShowCountdown(true)

        let count = 3
        setCountdown(count)

        const interval = setInterval(async () => {
            count--
            setCountdown(count)

            if (count <= 0) {
                clearInterval(interval)
                try {
                    await startWaitingMatch(matchId)
                    router.push(`/battle/${matchId}`)
                } catch (err) {
                    console.error('Failed to start match:', err)
                }
            }
        }, 1000)
    }, [matchId, router])

    // Load initial match state
    useEffect(() => {
        async function loadMatch() {
            try {
                const data = await getMatchInfo(matchId)
                if (!data) {
                    setError('房間不存在')
                    setStatus('error')
                    return
                }
                if (data.status === 'playing') {
                    router.push(`/battle/${matchId}`)
                    return
                }
                if (data.status === 'cancelled') {
                    setError('房間已取消')
                    setStatus('error')
                    return
                }
                setMatch(data as MatchInfo)
                setStatus('waiting')

                // Note: We don't auto-start countdown anymore
                // The host must manually start the game
            } catch (err) {
                console.error('Failed to load match:', err)
                setError('無法載入房間')
                setStatus('error')
            }
        }
        loadMatch()
    }, [matchId, router, startCountdown])

    // Subscribe to Pusher for real-time updates
    useEffect(() => {
        if (!matchId) return

        const pusher = getPusherClient()
        const channel = pusher.subscribe(getRoomChannel(matchId))

        channel.bind(ROOM_EVENTS.PLAYER_JOINED, (data: { player: MatchPlayer }) => {
            setMatch(prev => {
                if (!prev) return prev
                // Avoid duplicate
                if (prev.players.some(p => p.playerId === data.player.playerId)) {
                    return prev
                }
                return {
                    ...prev,
                    players: [...prev.players, data.player],
                }
            })
            // Don't auto-start countdown - wait for host to click start
        })

        // Listen for host starting the countdown
        channel.bind(ROOM_EVENTS.START_COUNTDOWN, () => {
            startCountdown()
        })

        channel.bind(ROOM_EVENTS.HOST_LEFT, () => {
            // Ignore if we're the one leaving
            if (isLeavingRef.current) return
            setError('房主已離開，房間關閉')
            setStatus('error')
        })

        channel.bind(ROOM_EVENTS.GAME_STARTED, () => {
            router.push(`/battle/${matchId}`)
        })

        // Listen for guest leaving
        channel.bind(ROOM_EVENTS.GUEST_LEFT, () => {
            setMatch(prev => {
                if (!prev) return prev
                // Remove player_2 from the players list
                return {
                    ...prev,
                    players: prev.players.filter(p => p.playerId === 'player_1'),
                }
            })
        })

        return () => {
            pusher.unsubscribe(getRoomChannel(matchId))
        }
    }, [matchId, router, startCountdown])

    // Bot mode: trigger bot join after 1 second
    useEffect(() => {
        if (isHost && match?.isBot && !hasGuest && status === 'waiting') {
            const timer = setTimeout(() => {
                triggerBotJoin(matchId)
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [isHost, match?.isBot, hasGuest, matchId, status])

    // Handle leaving room
    const handleLeave = async () => {
        isLeavingRef.current = true
        setStatus('leaving') // Prevent showing error from own HOST_LEFT event
        if (session?.user?.id) {
            await leaveWaitingMatch(matchId, session.user.id)
        }
        router.push('/lobby')
    }

    // Handle host starting the game
    const handleStartGame = async () => {
        if (!session?.user?.id) return
        const result = await hostStartGame(matchId, session.user.id)
        if (!result.success) {
            console.error('Failed to start game:', result.error)
        }
    }

    // Error state
    if (status === 'error') {
        return (
            <div className="min-h-dvh flex flex-col items-center justify-center bg-[#F5F8FC] p-6">
                <X className="w-16 h-16 text-red-400 mb-4" />
                <h1 className="text-xl font-bold text-[#333] mb-2">發生錯誤</h1>
                <p className="text-[#64748b] mb-6">{error}</p>
                <Link href="/lobby">
                    <motion.button
                        className="px-6 py-3 bg-[#5B8BD4] text-white font-semibold rounded-xl"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        返回大廳
                    </motion.button>
                </Link>
            </div>
        )
    }

    // Loading state
    if (status === 'loading' || !match) {
        return (
            <div className="min-h-dvh flex flex-col items-center justify-center bg-[#F5F8FC]">
                <div className="w-12 h-12 border-4 border-[#5B8BD4] border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-[#64748b]">載入中...</p>
            </div>
        )
    }

    return (
        <div className="min-h-dvh flex flex-col bg-[#F5F8FC] relative overflow-hidden">
            <CountdownOverlay isVisible={showCountdown} number={countdown} />

            {/* Header */}
            <header className="px-6 py-5 border-b-2 border-[#D5E3F7] bg-white flex justify-between items-center z-10">
                <div className="flex flex-col">
                    <h1 className="text-xl font-black text-[#333]">等待對戰</h1>
                    <p className="text-xs text-[#64748b] font-bold uppercase tracking-widest mt-1">
                        {languageTestNames[match.targetLanguage]} · {rankToLevel(match.targetLanguage, match.rank)} · {match.questionCount}題
                    </p>
                </div>
                <div className="px-4 py-1.5 bg-[#D5E3F7] rounded-full text-sm font-black text-[#5B8BD4] shadow-sm">
                    {match.isBot ? 'BOT MODE' : 'PVP MODE'}
                </div>
            </header>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-12">
                {/* VS Indicator */}
                <div className="relative w-64 h-64 mb-8">
                    <AnimatePresence>
                        {!hasGuest && (
                            <>
                                <motion.div
                                    initial={{ scale: 1, opacity: 0.5 }}
                                    animate={{ scale: 1.8, opacity: 0 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                                    className="absolute inset-0 rounded-full border-2 border-[#5B8BD4]/30"
                                />
                                <motion.div
                                    initial={{ scale: 1, opacity: 0.3 }}
                                    animate={{ scale: 2.2, opacity: 0 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                                    className="absolute inset-0 rounded-full border-2 border-[#5B8BD4]/20"
                                />
                            </>
                        )}
                    </AnimatePresence>

                    <div className="absolute inset-0 rounded-full border-4 border-white shadow-xl bg-white/50 backdrop-blur-sm flex items-center justify-center">
                        <motion.div
                            animate={!hasGuest ? { rotate: 360 } : {}}
                            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                            className={`w-[90%] h-[90%] rounded-full border-t-4 ${!hasGuest ? 'border-[#5B8BD4]' : 'border-transparent'} flex items-center justify-center`}
                        >
                            <div className="text-center">
                                <p className="text-3xl font-black text-[#333] italic">VS</p>
                                <p className="text-[10px] uppercase font-bold text-[#64748b] tracking-tighter mt-1">
                                    {hasGuest ? 'Arena Ready' : 'Searching...'}
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Players */}
                <div className="flex items-start justify-center gap-12 w-full max-w-md">
                    {/* Self */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-4"
                    >
                        <div className="relative">
                            <Avatar
                                src={myPlayer?.avatar || session?.user?.image || ''}
                                alt={myPlayer?.name || session?.user?.name || 'You'}
                                fallback={(myPlayer?.name?.[0] || session?.user?.name?.[0] || '?').toUpperCase()}
                                size="lg"
                            />
                            <motion.div
                                className="absolute -top-1 -right-1 bg-[#22c55e] text-white p-1 rounded-full border-2 border-white shadow-md"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                            >
                                <CheckCircle2 className="w-4 h-4" />
                            </motion.div>
                        </div>
                        <div className="text-center">
                            <p className="font-black text-[#333]">{myPlayer?.name || session?.user?.name || 'You'}</p>
                            <p className="text-[10px] font-bold uppercase text-[#22c55e]">READY</p>
                        </div>
                    </motion.div>

                    {/* Opponent */}
                    {hasGuest ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col items-center gap-4"
                        >
                            <div className="relative">
                                <Avatar
                                    src={opponentPlayer?.avatar || ''}
                                    alt={opponentPlayer?.name || 'Opponent'}
                                    fallback={opponentPlayer?.isBot ? '🤖' : (opponentPlayer?.name?.[0] || '?').toUpperCase()}
                                    size="lg"
                                />
                                <motion.div
                                    className="absolute -top-1 -right-1 bg-[#22c55e] text-white p-1 rounded-full border-2 border-white shadow-md"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                </motion.div>
                            </div>
                            <div className="text-center">
                                <p className="font-black text-[#333]">{opponentPlayer?.name || 'Opponent'}</p>
                                <p className="text-[10px] font-bold uppercase text-[#22c55e]">READY</p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            className="flex flex-col items-center gap-4 opacity-30"
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            <div className="w-24 h-24 rounded-full bg-white border-4 border-dashed border-[#D5E3F7] flex items-center justify-center">
                                <Users className="w-8 h-8 text-[#D5E3F7]" />
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-[#64748b]">
                                    {match.isBot ? '連接中...' : '等待對手...'}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-white border-t-2 border-[#D5E3F7] z-10">
                <AnimatePresence mode="wait">
                    {status === 'starting' ? (
                        <motion.div
                            key="starting"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-4"
                        >
                            <p className="text-[#5B8BD4] font-black text-xl italic animate-pulse">
                                戰鬥即將開始...
                            </p>
                        </motion.div>
                    ) : isHost && hasGuest ? (
                        <motion.div
                            key="host-ready"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex gap-3"
                        >
                            <button
                                onClick={handleLeave}
                                className="w-full px-4 py-2 text-sm font-semibold rounded-xl text-[#64748b] hover:bg-[#D5E3F7] transition-all border-2 border-[#D5E3F7]"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleStartGame}
                                className="w-full px-6 py-4 text-lg font-black rounded-2xl bg-[#5B8BD4] text-white hover:bg-[#4A7BC4] transition-all shadow-lg"
                            >
                                開始遊戲
                            </button>
                        </motion.div>
                    ) : !isHost && hasGuest ? (
                        <motion.div
                            key="guest-waiting"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col gap-3"
                        >
                            <div className="text-center py-4">
                                <p className="text-[#64748b] font-semibold animate-pulse">
                                    等待房主開始遊戲...
                                </p>
                            </div>
                            <button
                                onClick={handleLeave}
                                className="w-full px-4 py-2 text-sm font-semibold rounded-xl text-[#64748b] hover:bg-[#D5E3F7] transition-all"
                            >
                                離開房間
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="normal"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <button
                                onClick={handleLeave}
                                className="w-full px-6 py-4 text-lg font-black rounded-2xl bg-white border-2 border-[#D5E3F7] text-[#64748b] hover:bg-[#D5E3F7] transition-all"
                            >
                                取消
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
