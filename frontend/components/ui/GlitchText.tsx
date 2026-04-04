'use client'
import { useEffect, useRef, useState } from 'react'

interface GlitchTextProps {
  text: string
  speed?: number       // velocidad base del glitch (ms entre frames)
  className?: string
}

export function GlitchText({ text, speed = 80, className = '' }: GlitchTextProps) {
  const [display, setDisplay] = useState(text)
  const frameRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const GLITCH_CHARS = '!<>-_\\/[]{}—=+*^?#░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█'

  useEffect(() => {
    let iteration = 0
    const maxIter = text.length * 3

    const animate = () => {
      setDisplay(
        text
          .split('')
          .map((char, i) => {
            if (char === '\n') return '\n'
            if (i < iteration / 3) return char
            if (Math.random() < 0.25)
              return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
            return char
          })
          .join('')
      )

      if (iteration < maxIter) {
        iteration += 1
        frameRef.current = setTimeout(animate, speed)
      } else {
        setDisplay(text)
      }
    }

    animate()
    return () => { if (frameRef.current) clearTimeout(frameRef.current) }
  }, [text, speed])

  return (
    <pre className={`font-mono whitespace-pre-wrap leading-relaxed select-none ${className}`}>
      {display}
    </pre>
  )
}
