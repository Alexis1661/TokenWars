'use client'
import { useEffect, useRef, useState } from 'react'

interface ShinyTextProps {
  text: string
  speed?: number
  className?: string
  style?: React.CSSProperties
}

export function ShinyText({ text, speed = 2.5, className = '', style }: ShinyTextProps) {
  return (
    <span
      className={`relative inline-block font-black ${className}`}
      style={{
        background: `linear-gradient(
          110deg,
          #facc15 0%,
          #fef08a 30%,
          #facc15 50%,
          #eab308 70%,
          #facc15 100%
        )`,
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: `shiny-sweep ${speed}s linear infinite`,
        ...style,
      }}
    >
      {text}
    </span>
  )
}
