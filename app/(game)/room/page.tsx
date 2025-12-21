'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RoomSetupScreen, WaitingRoomScreen } from '@/lib/ui/game'

export default function Page() {
  const router = useRouter()
  const [step, setStep] = useState<'setup' | 'waiting'>('setup')
  const [settings, setSettings] = useState<{
    lang: string
    level: string
    count: number
    mode: 'bot' | 'player'
  } | null>(null)

  const handleSetupComplete = useCallback((s: { lang: string, level: string, count: number, mode: 'bot' | 'player' }) => {
    setSettings(s)
    setStep('waiting')
  }, [])

  const handleStartBattle = useCallback(() => {
    if (!settings) return
    const params = new URLSearchParams({
      lang: settings.lang,
      level: settings.level,
      count: settings.count.toString(),
    })
    router.push(`/battle?${params.toString()}`)
  }, [settings, router])

  if (step === 'setup') {
    return <RoomSetupScreen onComplete={handleSetupComplete} />
  }

  return (
    <WaitingRoomScreen
      language={settings?.lang || 'zh'}
      level={settings?.level || '1級'}
      count={settings?.count || 10}
      mode={settings?.mode || 'bot'}
      onStart={handleStartBattle}
    />
  )
}
