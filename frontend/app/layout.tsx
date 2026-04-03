import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Token Wars',
  description: 'El juego de los agentes — ReAct, Tool Calling, Prompt Engineering',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-950 antialiased`}>{children}</body>
    </html>
  )
}
