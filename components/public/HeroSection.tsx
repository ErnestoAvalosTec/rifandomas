'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowDown, Flame, Shield, Zap } from 'lucide-react'

function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return <>{count.toLocaleString('es-MX')}</>
}

export function HeroSection() {
  const scrollToSorteos = () => {
    document.querySelector('#sorteos')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="inicio" className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-brand-bg bg-dot-pattern">
      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-ui mb-6 animate-fade-in">
          <Flame className="w-4 h-4" />
          <span>Sorteos activos ahora mismo</span>
        </div>

        {/* Title */}
        <h1 className="font-title text-6xl sm:text-8xl md:text-9xl leading-none tracking-wide text-white mb-4 animate-fade-in">
          GANA <span className="text-gradient-red">GRANDE</span>
          <br />
          EN MÉXICO
        </h1>

        {/* Subtitle */}
        <p className="font-body text-lg sm:text-xl text-brand-muted max-w-2xl mx-auto mb-8 leading-relaxed animate-fade-in">
          La plataforma de sorteos y rifas virtuales más confiable del país.
          Premios de alto valor, pagos seguros y resultados 100% transparentes.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in">
          <Button size="xl" onClick={scrollToSorteos} className="w-full sm:w-auto gap-2 shadow-lg shadow-primary/25">
            Ver Sorteos Activos
            <ArrowDown className="w-5 h-5" />
          </Button>
          <Button size="xl" variant="outline" className="w-full sm:w-auto gap-2"
            onClick={() => document.querySelector('#verificador')?.scrollIntoView({ behavior: 'smooth' })}>
            Verificar mi Boleto
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto animate-fade-in">
          <div className="text-center p-4 rounded-2xl bg-brand-card border border-brand-border">
            <p className="font-title text-3xl sm:text-4xl text-primary">
              <AnimatedCounter target={12480} />
            </p>
            <p className="text-xs sm:text-sm text-brand-muted font-ui mt-1">Boletos Vendidos</p>
          </div>
          <div className="text-center p-4 rounded-2xl bg-brand-card border border-brand-border">
            <p className="font-title text-3xl sm:text-4xl text-white">
              <AnimatedCounter target={348} />
            </p>
            <p className="text-xs sm:text-sm text-brand-muted font-ui mt-1">Ganadores</p>
          </div>
          <div className="text-center p-4 rounded-2xl bg-brand-card border border-brand-border">
            <p className="font-title text-3xl sm:text-4xl text-brand-green">
              <AnimatedCounter target={24} />
            </p>
            <p className="text-xs sm:text-sm text-brand-muted font-ui mt-1">Sorteos Activos</p>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-brand-muted text-xs sm:text-sm font-ui animate-fade-in">
          <span className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-brand-green" />
            Pagos seguros
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-brand-gold" />
            Confirmación instantánea
          </span>
          <span className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-primary" />
            Sorteos verificados
          </span>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={scrollToSorteos}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-brand-muted hover:text-white transition-colors duration-200 cursor-pointer"
        aria-label="Ver sorteos"
      >
        <span className="text-xs font-ui">Explorar sorteos</span>
        <div className="w-6 h-10 rounded-full border border-brand-border flex items-start justify-center p-1.5">
          <div className="w-1 h-2 rounded-full bg-primary animate-bounce" />
        </div>
      </button>
    </section>
  )
}
