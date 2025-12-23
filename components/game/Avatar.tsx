'use client'

import { useState } from 'react'
import Image from 'next/image'

interface AvatarProps {
  src: string | null
  alt: string
  fallback: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  badge?: 'online' | 'ai' | 'level' | string
  badgeValue?: string | number
  className?: string
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
}

const imageSizes = {
  sm: 48,
  md: 64,
  lg: 96,
  xl: 128,
}

export function Avatar({
  src,
  alt,
  fallback,
  size = 'md',
  badge,
  badgeValue,
  className = ''
}: AvatarProps) {
  const [hasError, setHasError] = useState(false)

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full bg-(--game-secondary) border-3 border-white shadow-lg overflow-hidden flex items-center justify-center`}>
        {hasError || !src ? (
          <span className={`text-${size === 'lg' ? '5xl' : size === 'md' ? '3xl' : '2xl'} select-none`}>
            {fallback}
          </span>
        ) : (
          <Image
            src={src}
            alt={alt}
            width={imageSizes[size]}
            height={imageSizes[size]}
            className="object-cover"
            onError={() => setHasError(true)}
          />
        )}
      </div>

      {badge === 'online' && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-(--game-success) rounded-full border-2 border-white" />
      )}

      {(badge === 'ai' || (badge && badge !== 'online' && badge !== 'level')) && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-(--game-info) rounded-full border-2 border-white flex items-center justify-center">
          <span className="text-[8px] text-white font-bold">{badge === 'ai' ? 'AI' : badge}</span>
        </div>
      )}

      {badge === 'level' && badgeValue && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-1 bg-(--game-accent) text-white text-xs font-bold rounded-full shadow">
          Lv.{badgeValue}
        </div>
      )}
    </div>
  )
}
