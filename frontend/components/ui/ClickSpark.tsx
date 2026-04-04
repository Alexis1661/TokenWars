'use client'
import { useEffect } from 'react'

export function ClickSpark() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const count = 6
      for (let i = 0; i < count; i++) {
        const spark = document.createElement('div')
        const angle = (360 / count) * i
        const dist = 28 + Math.random() * 20
        const rad = (angle * Math.PI) / 180
        const tx = Math.cos(rad) * dist
        const ty = Math.sin(rad) * dist

        spark.style.cssText = `
          pointer-events: none;
          position: fixed;
          z-index: 9999;
          left: ${e.clientX}px;
          top: ${e.clientY}px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #facc15;
          box-shadow: 0 0 4px #facc15;
          transform: translate(-50%, -50%);
          animation: none;
          transition: transform 0.35s ease-out, opacity 0.35s ease-out;
        `
        document.body.appendChild(spark)

        requestAnimationFrame(() => {
          spark.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`
          spark.style.opacity = '0'
        })

        setTimeout(() => spark.remove(), 380)
      }
    }

    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  return null
}
