'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  ChevronLeft, ChevronRight,
  Shield, CreditCard, CheckCircle2,
  Star, Ticket,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export interface HeroSlide {
  id: string
  imagen_url: string
  titulo?: string | null
}

export interface SorteoDestacado {
  id: string
  nombre: string
  precio_unitario: number
  total_numeros: number
  boletos_vendidos: number
  fecha_sorteo: string
  premios: { lugar: number; nombre: string; imagen_url: string | null; valor_estimado: number | null }[]
}

interface HeroSectionProps {
  slides: HeroSlide[]
  sorteoDestacado?: SorteoDestacado | null
}

// ─── Countdown ────────────────────────────────────────────────────────────────
function useCountdown(targetDate: string) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 })
  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now()
      if (diff <= 0) return setT({ d: 0, h: 0, m: 0, s: 0 })
      setT({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [targetDate])
  return t
}

// ─── Image Slider ─────────────────────────────────────────────────────────────
function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [current, setCurrent] = useState(0)
  const [fading, setFading] = useState(false)

  const goTo = useCallback((idx: number) => {
    setFading(true)
    setTimeout(() => { setCurrent(idx); setFading(false) }, 200)
  }, [])

  const next = useCallback(() => goTo((current + 1) % Math.max(slides.length, 1)), [current, slides.length, goTo])
  const prev = useCallback(() => goTo((current - 1 + slides.length) % Math.max(slides.length, 1)), [current, slides.length, goTo])

  useEffect(() => {
    if (slides.length <= 1) return
    const id = setInterval(next, 5000)
    return () => clearInterval(id)
  }, [next, slides.length])

  if (!slides.length) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[220px] sm:min-h-[300px] lg:min-h-[420px]"
        style={{ background: '#166534', borderRadius: 10, gap: 14 }}
      >
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ticket style={{ width: 34, height: 34, color: '#fff' }} />
        </div>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, textAlign: 'center', padding: '0 28px' }}>
          Agrega imágenes del banner desde<br />Panel Admin → Hero
        </p>
      </div>
    )
  }

  const slide = slides[current]
  return (
    <div
      className="relative overflow-hidden min-h-[220px] sm:min-h-[300px] lg:min-h-[420px]"
      style={{ background: '#111', borderRadius: 10 }}
    >
      <div style={{ position: 'absolute', inset: 0, opacity: fading ? 0 : 1, transition: 'opacity 200ms ease' }}>
        <Image src={slide.imagen_url} alt={slide.titulo ?? 'Banner'} fill style={{ objectFit: 'cover' }} priority />
        {slide.titulo && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '12px 20px', background: 'rgba(0,0,0,0.52)',
          }}>
            <p style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{slide.titulo}</p>
          </div>
        )}
      </div>

      {slides.length > 1 && (
        <>
          <button onClick={prev} aria-label="Anterior" style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 3,
            width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(0,0,0,0.55)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ChevronLeft style={{ width: 18, height: 18 }} />
          </button>
          <button onClick={next} aria-label="Siguiente" style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 3,
            width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(0,0,0,0.55)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ChevronRight style={{ width: 18, height: 18 }} />
          </button>
        </>
      )}

      {slides.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 6, zIndex: 3,
        }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} aria-label={`Slide ${i + 1}`} style={{
              width: i === current ? 20 : 7, height: 7, borderRadius: 4,
              background: i === current ? '#fff' : 'rgba(255,255,255,0.45)',
              border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Featured Sorteo Card ─────────────────────────────────────────────────────
function FeaturedSorteoCard({ sorteo }: { sorteo: SorteoDestacado }) {
  const primerPremio = sorteo.premios.find(p => p.lugar === 1) ?? sorteo.premios[0]
  const porcentaje = Math.min(100, Math.round((sorteo.boletos_vendidos / sorteo.total_numeros) * 100))
  const t = useCountdown(sorteo.fecha_sorteo)

  return (
    <div
      className="flex flex-col lg:h-full"
      style={{
        background: '#166534',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10, overflow: 'hidden',
      }}
    >
      {/* On mobile: horizontal layout (image left, info right). On lg: vertical */}
      <div className="flex flex-row lg:flex-col">

        {/* Image */}
        <div
          className="relative w-[130px] sm:w-[160px] lg:w-full h-auto lg:h-[180px] flex-shrink-0"
          style={{ background: 'rgba(0,0,0,0.25)', minHeight: 130 }}
        >
          {primerPremio?.imagen_url ? (
            <Image
              src={primerPremio.imagen_url}
              alt={primerPremio.nombre}
              fill
              style={{ objectFit: 'contain', padding: 12 }}
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ticket style={{ width: 44, height: 44, color: 'rgba(255,255,255,0.25)' }} />
            </div>
          )}
          <div style={{ position: 'absolute', top: 8, left: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              background: '#F97316', color: '#fff',
              borderRadius: 4, padding: '2px 7px',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.03em',
            }}>
              <Star style={{ width: 8, height: 8 }} />
              DESTACADO
            </span>
          </div>
        </div>

        {/* Info — shown beside image on mobile, below on lg */}
        <div className="flex flex-col flex-1 p-3 lg:p-4">
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 800, lineHeight: 1.2, marginBottom: 4 }}>
            {primerPremio?.nombre ?? sorteo.nombre}
          </h3>
          {primerPremio?.valor_estimado && (
            <div style={{ marginBottom: 10 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(249,115,22,0.2)', border: '1px solid rgba(249,115,22,0.4)',
                color: '#fdba74', borderRadius: 6, padding: '3px 10px',
                fontSize: 13, fontWeight: 700,
              }}>
                Valor: {formatCurrency(primerPremio.valor_estimado)}
              </span>
            </div>
          )}

          {/* Progress */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
                {sorteo.boletos_vendidos.toLocaleString('es-MX')} vendidos
              </span>
              <span style={{ fontSize: 11, color: '#4ADE80', fontWeight: 700 }}>{porcentaje}%</span>
            </div>
            <div style={{ height: 5, background: 'rgba(0,0,0,0.35)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${porcentaje}%`, background: '#4ADE80', borderRadius: 3 }} />
            </div>
          </div>

          {/* Countdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, marginBottom: 12 }}>
            {[{ v: t.d, l: 'días' }, { v: t.h, l: 'hrs' }, { v: t.m, l: 'min' }, { v: t.s, l: 'seg' }].map(({ v, l }) => (
              <div key={l} style={{ background: '#fff', borderRadius: 5, padding: '6px 3px', textAlign: 'center' }}>
                <p style={{ fontSize: 17, fontWeight: 800, color: '#14532d', lineHeight: 1 }}>{String(v).padStart(2, '0')}</p>
                <p style={{ fontSize: 9, color: '#6B7280', marginTop: 2, fontWeight: 500 }}>{l}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => document.querySelector('#sorteos')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              width: '100%', padding: '11px 0',
              background: '#F97316', color: '#fff',
              fontSize: 14, fontWeight: 800,
              borderRadius: 6, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'opacity 0.15s', marginTop: 'auto',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            <Ticket style={{ width: 14, height: 14 }} />
            Participar ahora
          </button>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#86EFAC', marginTop: 5, fontWeight: 600 }}>
            Desde {formatCurrency(sorteo.precio_unitario)} por boleto
          </p>
        </div>
      </div>

      {/* WhatsApp link — sell the featured spot */}
      <a
        href="https://wa.me/3317385212?text=Quiero%20ser%20Destacado"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block', textAlign: 'center',
          fontSize: 10, color: 'rgba(255,255,255,0.3)',
          padding: '7px 0',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          textDecoration: 'none',
          transition: 'color 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
      >
        ¿Quieres aparecer aquí?
      </a>
    </div>
  )
}

function NoFeaturedCard() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[160px] lg:h-full"
      style={{
        background: '#166534',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10, overflow: 'hidden',
        padding: 24, textAlign: 'center', gap: 14,
      }}
    >
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(249,115,22,0.15)',
        border: '1px solid rgba(249,115,22,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Star style={{ width: 30, height: 30, color: '#F97316' }} />
      </div>
      <div>
        <p style={{ color: '#fff', fontWeight: 800, fontSize: 17, marginBottom: 6 }}>
          Espacio Destacado
        </p>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 1.6 }}>
          Coloca tu sorteo aquí y llega a<br />miles de participantes.
        </p>
      </div>
      <a
        href="https://wa.me/3317385212?text=Quiero%20ser%20Destacado"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '10px 22px', background: '#25D366',
          color: '#fff', fontSize: 13, fontWeight: 700,
          borderRadius: 6, textDecoration: 'none',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
      >
        ¿Quieres aparecer aquí?
      </a>
    </div>
  )
}

// ─── Trust Bar ────────────────────────────────────────────────────────────────
const TRUST_ITEMS = [
  { icon: Shield,       label: 'Pagos 100% seguros',    sub: 'Tecnologia SSL certificada'   },
  { icon: CreditCard,   label: 'Sin datos bancarios',    sub: 'No pedimos tarjeta ni CLABE'  },
  { icon: CheckCircle2, label: 'Confirmacion inmediata', sub: 'Recibe tu boleto al instante' },
]

// ─── Main Component ───────────────────────────────────────────────────────────
export function HeroSection({ slides, sorteoDestacado }: HeroSectionProps) {
  return (
    <section id="inicio" style={{ background: '#1c1c1c' }}>
      {/* Slider + Featured card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_290px] gap-2 lg:gap-[3px]">
          <HeroSlider slides={slides} />
          {sorteoDestacado
            ? <FeaturedSorteoCard sorteo={sorteoDestacado} />
            : <NoFeaturedCard />
          }
        </div>
      </div>

      {/* Trust / CTA bar */}
      <div style={{ background: '#1c1c1c', paddingBottom: 20 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div
            className="grid grid-cols-3 divide-x"
            style={{ background: '#14532d', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '0 0 10px 10px' }}
          >
            {TRUST_ITEMS.map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:justify-center gap-3 sm:gap-5 py-6 px-3 sm:px-8"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <div
                  className="rounded-full sm:rounded-[8px] flex-shrink-0"
                  style={{
                    width: 56, height: 56,
                    background: 'rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon style={{ width: 28, height: 28, color: '#4ADE80' }} />
                </div>
                <div>
                  <p
                    className="text-xs sm:text-base"
                    style={{ color: '#fff', fontWeight: 700, lineHeight: 1.3 }}
                  >
                    {label}
                  </p>
                  <p
                    className="hidden sm:block"
                    style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}
                  >
                    {sub}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
