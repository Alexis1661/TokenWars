import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen cup-stars-bg flex flex-col items-center justify-center p-8 relative overflow-hidden"
      style={{ background: 'var(--cup-bg)' }}>

      {/* Viñeta */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)' }} />

      {/* Detalles decorativos de esquina */}
      <Corner pos="top-4 left-4" />
      <Corner pos="top-4 right-4 scale-x-[-1]" />
      <Corner pos="bottom-4 left-4 scale-y-[-1]" />
      <Corner pos="bottom-4 right-4 scale-[-1]" />

      <div className="relative flex flex-col items-center gap-8 w-full max-w-sm">

        {/* Logo */}
        <div className="text-center">
          <div className="text-7xl mb-2 animate-bounce" style={{ animationDuration: '2s' }}>🎮</div>
          <h1 className="text-7xl cup-text-outline" style={{
            fontFamily: "'Lilita One', cursive",
            color: 'var(--cup-gold)',
            lineHeight: 1,
          }}>
            TOKEN<br />WARS
          </h1>
          <div className="cup-divider mt-3 text-sm">El juego de los agentes</div>
          <div className="flex gap-2 justify-center mt-2 flex-wrap">
            {['ReAct', 'Tool Calling', 'Prompt Eng.'].map((t) => (
              <span key={t} className="cup-badge" style={{ background: 'var(--cup-bg2)', border: '2px solid var(--cup-gold)', color: 'var(--cup-gold)' }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Botones */}
        <div className="flex flex-col gap-4 w-full">
          <Link href="/join" className="cup-btn cup-btn-gold block text-center text-2xl py-4 px-6 no-underline">
            🎯 Unirse a partida
          </Link>
          <Link href="/host" className="cup-btn cup-btn-dark block text-center text-xl py-3 px-6 no-underline">
            🎛️ Panel del Profesor
          </Link>
        </div>
      </div>
    </main>
  )
}

function Corner({ pos }: { pos: string }) {
  return (
    <div className={`absolute ${pos} w-16 h-16 pointer-events-none`}>
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4 L4 24 M4 4 L24 4" stroke="#d4a017" strokeWidth="3" strokeLinecap="round"/>
        <path d="M4 4 L16 16" stroke="#d4a017" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
        <circle cx="4" cy="4" r="3" fill="#d4a017"/>
        <circle cx="24" cy="4" r="1.5" fill="#d4a017" opacity="0.6"/>
        <circle cx="4" cy="24" r="1.5" fill="#d4a017" opacity="0.6"/>
      </svg>
    </div>
  )
}
