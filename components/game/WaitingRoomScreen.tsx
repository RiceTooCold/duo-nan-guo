'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar } from './Avatar'
import { CountdownOverlay } from './CountdownOverlay'
import { Bot, Users, CheckCircle2, MessageSquare } from 'lucide-react'

interface Player {
    id: string
    name: string
    avatar: string
    fallback: string
    isReady: boolean
    taunt?: string
}

interface WaitingRoomScreenProps {
    language: string
    level: string
    count: number
    mode: 'bot' | 'player'
    onStart: () => Promise<void>  // Now async to allow match creation
    onCancel?: () => void  // 取消回到設定
}

const TAUNTS = ['😂', '😎', '🔥', '💩', '😠', '🙏']

export function WaitingRoomScreen({ language, level, count, mode, onStart, onCancel }: WaitingRoomScreenProps) {
    const [status, setStatus] = useState<'searching' | 'waiting' | 'starting'>('searching')
    const [players, setPlayers] = useState<Player[]>([
        { id: 'me', name: '你 (Player)', avatar: '/mascot-parrot.jpg', fallback: '🦜', isReady: false }
    ])
    const [countdown, setCountdown] = useState(5)
    const [showCountdown, setShowCountdown] = useState(false)
    const timerRef = useRef<number>(5)
    const hasStartedRef = useRef<boolean>(false)

    // 1. Simulate finding an opponent
    useEffect(() => {
        if (status === 'searching') {
            const timer = setTimeout(() => {
                const opponent: Player = mode === 'bot'
                    ? { id: 'bot', name: 'RiceBot', avatar: '/mascot-robot.jpg', fallback: '🤖', isReady: true }
                    : { id: 'other', name: '對手玩家', avatar: '', fallback: '👤', isReady: false }

                setPlayers(prev => [...prev, opponent])
                setStatus('waiting')
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [status, mode])

    // 2. Bot auto-ready or simulate opponent ready
    useEffect(() => {
        if (status === 'waiting') {
            const unreadyPlayer = players.find(p => !p.isReady && p.id !== 'me')
            if (unreadyPlayer) {
                const timer = setTimeout(() => {
                    setPlayers(prev => prev.map(p => p.id === unreadyPlayer.id ? { ...p, isReady: true } : p))
                }, 1500)
                return () => clearTimeout(timer)
            }
        }
    }, [status, players])

    // 3. Check if everyone is ready to trigger "starting" status
    useEffect(() => {
        const allReady = players.length >= 2 && players.every(p => p.isReady)
        if (allReady && status === 'waiting') {
            console.log('✅ All ready! Switching status to: starting')
            setStatus('starting')
        }
    }, [players, status])

    // 4. Actual countdown timer
    useEffect(() => {
        if (status === 'starting' && !hasStartedRef.current) {
            console.log('🏁 Countdown effect started')
            setShowCountdown(true)
            timerRef.current = 5
            setCountdown(5)

            const interval = setInterval(() => {
                timerRef.current -= 1
                console.log('⏰ Tick:', timerRef.current)

                if (timerRef.current >= 0) {
                    setCountdown(timerRef.current)
                }

                if (timerRef.current <= 0) {
                    clearInterval(interval)
                    if (!hasStartedRef.current) {
                        hasStartedRef.current = true
                        console.log('🚀 Final call to onStart (async)')
                            // Await the async onStart (match creation + navigation)
                            ; (async () => {
                                await onStart()
                            })()
                    }
                }
            }, 1000)

            return () => {
                console.log('🧹 Effect cleanup - clearing interval')
                clearInterval(interval)
            }
        }
    }, [status, onStart])

    const toggleReady = () => {
        if (status === 'starting') return
        setPlayers(prev => prev.map(p => p.id === 'me' ? { ...p, isReady: !p.isReady } : p))
    }

    const sendTaunt = (emoji: string) => {
        if (status === 'starting') return
        setPlayers(prev => prev.map(p => p.id === 'me' ? { ...p, taunt: emoji } : p))
        setTimeout(() => {
            setPlayers(prev => prev.map(p => p.id === 'me' ? { ...p, taunt: undefined } : p))
        }, 2000)
    }

    // Random bot taunts
    useEffect(() => {
        if (status === 'waiting') { // Disable when starting to avoid state noise
            const bot = players.find(p => (p.id === 'bot' || p.id === 'other') && !p.taunt)
            if (bot) {
                const interval = setInterval(() => {
                    if (Math.random() > 0.7) {
                        const emoji = TAUNTS[Math.floor(Math.random() * TAUNTS.length)]
                        setPlayers(prev => prev.map(p => p.id === bot.id ? { ...p, taunt: emoji } : p))
                        setTimeout(() => {
                            setPlayers(prev => prev.map(p => p.id === bot.id ? { ...p, taunt: undefined } : p))
                        }, 2000)
                    }
                }, 5000)
                return () => clearInterval(interval)
            }
        }
    }, [status, players])

    return (
        <div className="min-h-dvh flex flex-col bg-[#F5F8FC] relative overflow-hidden">
            <CountdownOverlay isVisible={showCountdown} number={countdown} />

            {/* Header */}
            <header className="px-6 py-5 border-b-2 border-[#D5E3F7] bg-white flex justify-between items-center z-10">
                <div className="flex flex-col">
                    <h1 className="text-xl font-black text-[#333]">等待對戰</h1>
                    <p className="text-xs text-[#64748b] font-bold uppercase tracking-widest mt-1">
                        {language} · {level} · {count}題
                    </p>
                </div>
                <div className="px-4 py-1.5 bg-[#D5E3F7] rounded-full text-sm font-black text-[#5B8BD4] shadow-sm">
                    {mode === 'bot' ? 'BOT MODE' : 'MULTI MODE'}
                </div>
            </header>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-12">
                {/* Radar / Status Indicator */}
                <div className="relative w-64 h-64 mb-8">
                    <AnimatePresence>
                        {status === 'searching' && (
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

                    <div className="absolute inset-0 rounded-full border-4 border-white shadow-xl bg-white/50 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                        <motion.div
                            animate={status === 'searching' ? { rotate: 360 } : {}}
                            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                            className={`w-[90%] h-[90%] rounded-full border-t-4 ${status === 'searching' ? 'border-[#5B8BD4]' : 'border-transparent'} flex items-center justify-center`}
                        >
                            <div className="text-center">
                                <p className="text-3xl font-black text-[#333] italic">VS</p>
                                <p className="text-[10px] uppercase font-bold text-[#64748b] tracking-tighter mt-1">
                                    {status === 'searching' ? 'Searching...' : 'Arena Ready'}
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Players List */}
                <div className="flex items-start justify-center gap-12 w-full max-w-md">
                    {players.map((player, idx) => (
                        <motion.div
                            key={player.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.2 }}
                            className="flex flex-col items-center gap-4 relative"
                        >
                            <div className="relative">
                                <Avatar
                                    src={player.avatar}
                                    alt={player.name}
                                    fallback={player.fallback}
                                    size="lg"
                                />

                                {/* Ready Badge */}
                                <AnimatePresence>
                                    {player.isReady && (
                                        <motion.div
                                            className="absolute -top-1 -right-1 bg-[#22c55e] text-white p-1 rounded-full border-2 border-white shadow-md"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Taunt Popover */}
                                <AnimatePresence>
                                    {player.taunt && (
                                        <motion.div
                                            className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-2xl shadow-xl border-2 border-[#D5E3F7] whitespace-nowrap z-20"
                                            initial={{ opacity: 0, y: 10, scale: 0.5 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.5 }}
                                        >
                                            <span className="text-2xl">{player.taunt}</span>
                                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b-2 border-r-2 border-[#D5E3F7] rotate-45" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="text-center">
                                <p className="font-black text-[#333]">{player.name}</p>
                                <p className={`text-[10px] font-bold uppercase transition-colors ${player.isReady ? 'text-[#22c55e]' : 'text-[#64748b]'}`}>
                                    {player.isReady ? 'READY' : 'WAITING'}
                                </p>
                            </div>

                            {/* Taunt Buttons (only for me) */}
                            {player.id === 'me' && status !== 'starting' && (
                                <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-[120px]">
                                    {TAUNTS.map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => sendTaunt(emoji)}
                                            className="w-8 h-8 rounded-full bg-white border border-[#D5E3F7] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-sm"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ))}

                    {status === 'searching' && (
                        <motion.div
                            className="flex flex-col items-center gap-4 opacity-30"
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            <div className="w-24 h-24 rounded-full bg-white border-4 border-dashed border-[#D5E3F7] flex items-center justify-center">
                                <Users className="w-8 h-8 text-[#D5E3F7]" />
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-[#64748b]">Matchmaking...</p>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Footer / Control */}
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
                    ) : (
                        <motion.div
                            key="normal"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex gap-4"
                        >
                            {/* Cancel Button */}
                            {onCancel && (
                                <button
                                    onClick={onCancel}
                                    className="px-6 py-4 text-lg font-black rounded-2xl bg-white border-2 border-[#D5E3F7] text-[#64748b] hover:bg-[#D5E3F7] transition-all"
                                >
                                    取消
                                </button>
                            )}
                            <button
                                onClick={toggleReady}
                                disabled={status === 'searching'}
                                className={`flex-1 py-4 text-lg font-black rounded-2xl transition-all shadow-lg ${players.find(p => p.id === 'me')?.isReady
                                    ? 'bg-[#ef4444] text-white shadow-[#ef4444]/20'
                                    : 'bg-[#5B8BD4] text-white shadow-[#5B8BD4]/30 active:scale-95'
                                    } ${status === 'searching' ? 'opacity-50 cursor-not-allowed shadow-none' : ''}`}
                            >
                                {players.find(p => p.id === 'me')?.isReady ? '取消準備' : '準備完成'}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Decorative background characters (reusing from Login but themed) */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] select-none text-9xl font-black">
                <div className="absolute top-1/4 -left-10 rotate-12">{language === 'ja' ? 'あ' : language === 'zh' ? '文' : 'K'}</div>
                <div className="absolute bottom-1/4 -right-10 -rotate-12">{language === 'ko' ? '가' : 'B'}</div>
            </div>
        </div>
    )
}
