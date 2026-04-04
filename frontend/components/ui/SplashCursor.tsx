'use client'
import { useEffect, useRef } from 'react'

export function SplashCursor({
  color = 'rgba(250,204,21,0.55)',  // yellow-400 semi-transparent
  radius = 150,
  dissipation = 0.97,
}: {
  color?: string
  radius?: number
  dissipation?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointsRef = useRef<{ x: number; y: number; life: number; vx: number; vy: number }[]>([])
  const rafRef = useRef<number | null>(null)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const onMove = (e: MouseEvent) => {
      const x = e.clientX
      const y = e.clientY
      const prev = lastPos.current
      const speed = prev ? Math.hypot(x - prev.x, y - prev.y) : 0
      lastPos.current = { x, y }

      const count = Math.max(1, Math.floor(speed / 8))
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const mag = Math.random() * speed * 0.25
        pointsRef.current.push({
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 10,
          life: 1,
          vx: Math.cos(angle) * mag,
          vy: Math.sin(angle) * mag,
        })
      }
    }
    window.addEventListener('mousemove', onMove)

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pointsRef.current = pointsRef.current.filter(p => p.life > 0.02)

      for (const p of pointsRef.current) {
        const r = radius * p.life
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r)
        grad.addColorStop(0, color.replace(')', `, ${p.life * 0.35})`).replace('rgba(', 'rgba(').replace('0.55)', `${p.life * 0.35})`))
        grad.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.9
        p.vy *= 0.9
        p.life *= dissipation
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [color, radius, dissipation])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9998]"
      style={{ mixBlendMode: 'screen' }}
    />
  )
}
