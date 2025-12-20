'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Camera, Check } from 'lucide-react'
import { Avatar } from './components/Avatar'

const avatarOptions = ['🦜', '🐶', '🐱', '🦊', '🐻', '🐼', '🐨', '🐯']

export function SettingsScreen() {
  const [name, setName] = useState('語言達人')
  const [selectedAvatar, setSelectedAvatar] = useState('🦜')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

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
        <h1 className="text-lg font-bold text-[#333]">帳號設定</h1>
      </header>

      <div className="flex-1 px-4 py-6 space-y-6">
        {/* Avatar Section */}
        <section className="bg-white rounded-2xl border-2 border-[#D5E3F7] p-6">
          <h2 className="text-sm font-semibold text-[#64748b] mb-4">選擇頭像</h2>
          
          {/* Current Avatar Preview */}
          <div className="flex justify-center mb-6">
            <motion.div 
              className="relative"
              key={selectedAvatar}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#D5E3F7] to-[#A9C4EB] border-4 border-white shadow-lg flex items-center justify-center text-5xl">
                {selectedAvatar}
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#5B8BD4] rounded-full flex items-center justify-center shadow">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </motion.div>
          </div>

          {/* Avatar Grid */}
          <div className="grid grid-cols-4 gap-3">
            {avatarOptions.map((avatar) => (
              <motion.button
                key={avatar}
                onClick={() => setSelectedAvatar(avatar)}
                className={`w-full aspect-square rounded-2xl flex items-center justify-center text-3xl transition-all ${
                  selectedAvatar === avatar
                    ? 'bg-[#D5E3F7] border-2 border-[#5B8BD4]'
                    : 'bg-[#F5F8FC] border-2 border-transparent hover:bg-[#D5E3F7]'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {avatar}
              </motion.button>
            ))}
          </div>
        </section>

        {/* Name Section */}
        <section className="bg-white rounded-2xl border-2 border-[#D5E3F7] p-6">
          <h2 className="text-sm font-semibold text-[#64748b] mb-4">顯示名稱</h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="輸入你的名稱"
            className="w-full px-4 py-3 rounded-xl border-2 border-[#D5E3F7] bg-white text-[#333] text-lg font-medium focus:outline-none focus:border-[#5B8BD4] transition-all"
            maxLength={20}
          />
          <p className="text-xs text-[#64748b] mt-2">{name.length}/20 字元</p>
        </section>

        {/* Account Info (Read Only) */}
        <section className="bg-white rounded-2xl border-2 border-[#D5E3F7] p-6">
          <h2 className="text-sm font-semibold text-[#64748b] mb-4">帳號資訊</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-[#D5E3F7]">
              <span className="text-[#64748b]">電子郵件</span>
              <span className="text-[#333] font-medium">user@example.com</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#D5E3F7]">
              <span className="text-[#64748b]">等級</span>
              <span className="text-[#333] font-medium">Lv. 15</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[#64748b]">加入日期</span>
              <span className="text-[#333] font-medium">2024-01-01</span>
            </div>
          </div>
        </section>
      </div>

      {/* Save Button */}
      <div className="p-4 bg-white border-t-2 border-[#D5E3F7]">
        <motion.button
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full py-4 text-lg font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all ${
            saved
              ? 'bg-[#22c55e] text-white'
              : 'bg-[#5B8BD4] text-white'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isSaving ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full"
            />
          ) : saved ? (
            <>
              <Check className="w-5 h-5" />
              已儲存！
            </>
          ) : (
            '儲存變更'
          )}
        </motion.button>
      </div>
    </div>
  )
}

