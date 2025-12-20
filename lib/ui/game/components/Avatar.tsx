'use client'

import Image from 'next/image'

interface AvatarProps {
  src: string
  alt: string
  fallback: string
  size?: 'sm' | 'md' | 'lg'
  badge?: 'online' | 'ai' | 'level'
  badgeValue?: string | number
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
}

const imageSizes = {
  sm: 48,
  md: 64,
  lg: 96,
}

export function Avatar({ 
  src, 
  alt, 
  fallback, 
  size = 'md', 
  badge,
  badgeValue 
}: AvatarProps) {
  return (
    <div className={`relative ${sizeClasses[size]}`}>
      <div className={`${sizeClasses[size]} rounded-full bg-[#D5E3F7] border-3 border-white shadow-lg overflow-hidden flex items-center justify-center`}>
        <Image
          src={src}
          alt={alt}
          width={imageSizes[size]}
          height={imageSizes[size]}
          className="object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            target.parentElement!.innerHTML = `<span class="text-${size === 'lg' ? '5xl' : size === 'md' ? '3xl' : '2xl'}">${fallback}</span>`
          }}
        />
      </div>
      
      {badge === 'online' && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#22c55e] rounded-full border-2 border-white" />
      )}
      
      {badge === 'ai' && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#3b82f6] rounded-full border-2 border-white flex items-center justify-center">
          <span className="text-[8px] text-white font-bold">AI</span>
        </div>
      )}
      
      {badge === 'level' && badgeValue && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#5B8BD4] text-white text-xs font-bold rounded-full shadow">
          Lv.{badgeValue}
        </div>
      )}
    </div>
  )
}

