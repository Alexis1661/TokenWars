'use client'
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

export interface SpinWheelProps {
  options: string[]
  onStop: (winnerIndex: number) => void
  size?: number
}

export interface SpinWheelRef {
  spinTo: (index: number) => void
}

export const SpinWheel = forwardRef<SpinWheelRef, SpinWheelProps>(
  ({ options, onStop, size = 300 }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const wheelRef = useRef<any>(null)

    useEffect(() => {
      if (!containerRef.current || typeof window === 'undefined') return
      // Dynamic import so the module never executes on the server
      let mounted = true
      // @ts-ignore — spin-wheel has no type declarations
      import('spin-wheel').then(({ Wheel }: any) => {
        if (!mounted || !containerRef.current) return

        const LETTERS = ['A', 'B', 'C', 'D']
        const BG = ['#1a0a2e', '#0d1b2a', '#150825', '#0a1520']
        const items = options.map((_, i) => ({
          label: LETTERS[i] ?? String(i + 1),
          backgroundColor: BG[i % BG.length],
        }))

        wheelRef.current = new Wheel(containerRef.current, {
          items,
          itemLabelColors: ['#FFD700'],
          itemLabelRadius: 0.62,
          itemLabelRadiusMax: 0.62,
          itemLabelFontSizeMax: 48,
          itemLabelFont: "bold 'Orbitron', sans-serif",
          lineColor: '#FFD700',
          lineWidth: 2,
          pointerAngle: 90,
          radius: 0.95,
          isInteractive: false,
          onRest: (e: any) => onStop(e.currentIndex),
        })
      })
      return () => {
        mounted = false
        wheelRef.current = null
        if (containerRef.current) containerRef.current.innerHTML = ''
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options.join('|')])

    useImperativeHandle(ref, () => ({
      spinTo: (index: number) => {
        wheelRef.current?.spinToItem(index, 4000, true, 5, 1)
      },
    }))

    return (
      <div className="relative flex justify-center items-center" style={{ width: size, height: size }}>
        {/* Golden pointer triangle at top */}
        <div
          className="absolute z-10"
          style={{
            top: -8,
            width: 0,
            height: 0,
            borderLeft: '12px solid transparent',
            borderRight: '12px solid transparent',
            borderTop: '24px solid #FFD700',
            filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.7))',
          }}
        />
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            boxShadow: '0 0 40px rgba(255,215,0,0.4)',
          }}
        />
      </div>
    )
  }
)

SpinWheel.displayName = 'SpinWheel'
