import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SplashCursor } from '@/components/ui/SplashCursor'
import { ClickSpark } from '@/components/ui/ClickSpark'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Token Wars',
  description: 'El juego de los agentes — ReAct, Tool Calling, Prompt Engineering',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-950 antialiased`}>
        {/* Efectos de ambiente Cuphead */}
        <div className="film-grain-overlay" aria-hidden="true" />
        <SplashCursor color="rgba(250,204,21,0.55)" radius={120} />
        <ClickSpark />

        {children}
      </body>
    </html>
  )
}
