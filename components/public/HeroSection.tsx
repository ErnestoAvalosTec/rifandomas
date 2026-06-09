'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
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
  ctaBannerUrl?: string | null
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
        className="flex flex-col items-center justify-center min-h-[90px] sm:min-h-[300px] lg:min-h-[420px]"
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
      className="relative overflow-hidden min-h-[90px] sm:min-h-[300px] lg:min-h-[420px]"
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
  const router = useRouter()
  const [navigating, setNavigating] = useState(false)
  const primerPremio = sorteo.premios.find(p => p.lugar === 1) ?? sorteo.premios[0]
  const porcentaje = Math.min(100, Math.round((sorteo.boletos_vendidos / sorteo.total_numeros) * 100))
  const t = useCountdown(sorteo.fecha_sorteo)

  const irADetalle = (e: React.MouseEvent) => {
    e.preventDefault()
    setNavigating(true)
    router.push(`/sorteo/${sorteo.id}`)
  }

  return (
    <div
      className="flex flex-col lg:h-full"
      style={{
        position: 'relative',
        background: '#166534',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10, overflow: 'hidden',
      }}
    >
      {navigating && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          background: 'rgba(10,10,10,0.82)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 10,
          animation: 'rf-fadein 0.15s ease',
        }}>
          <div style={{
            width: 30, height: 30,
            border: '2.5px solid rgba(255,255,255,0.1)',
            borderTopColor: '#4ADE80',
            borderRadius: '50%',
            animation: 'rf-spin 0.75s linear infinite',
          }} />
          <span style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 10, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            Cargando
          </span>
        </div>
      )}
      {/* Siempre vertical — en mobile ocupa media pantalla, en lg ocupa el panel derecho */}
      <div className="flex flex-col h-full">

        {/* Image */}
        <div
          className="relative w-full flex-shrink-0 h-[100px] lg:h-[210px]"
          style={{ background: 'rgba(0,0,0,0.25)' }}
        >
          {primerPremio?.imagen_url ? (
            <Image src={primerPremio.imagen_url} alt={primerPremio.nombre} fill style={{ objectFit: 'contain', padding: 6 }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ticket style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.25)' }} />
            </div>
          )}
          {/* Badge DESTACADO — top-left */}
          <div style={{ position: 'absolute', top: 5, left: 5 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              background: '#F97316', color: '#fff',
              borderRadius: 4, padding: '2px 5px',
              fontSize: 8, fontWeight: 700, letterSpacing: '0.03em',
            }}>
              <Star style={{ width: 7, height: 7 }} />
              DESTACADO
            </span>
          </div>
          {/* Badge precio — bottom-left */}
          <div style={{ position: 'absolute', bottom: 5, left: 5 }}>
            <span style={{
              background: 'rgba(0,0,0,0.75)', color: '#fff',
              borderRadius: 4, padding: '2px 6px',
              fontSize: 9, fontWeight: 800, lineHeight: 1,
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(4px)',
            }}>
              {formatCurrency(sorteo.precio_unitario)}<span style={{ fontWeight: 400, fontSize: 7, marginLeft: 2 }}>/boleto</span>
            </span>
          </div>

          {/* Badge valor estimado — bottom-right (solo móvil; desktop lo muestra en el área de texto) */}
          {primerPremio?.valor_estimado ? (
            <div className="lg:hidden" style={{ position: 'absolute', bottom: 5, right: 5 }}>
              <span style={{
                background: 'rgba(0,0,0,0.72)',
                border: '1px solid rgba(249,115,22,0.55)',
                color: '#fdba74',
                borderRadius: 4, padding: '2px 5px',
                fontSize: 8, fontWeight: 700, lineHeight: 1,
                backdropFilter: 'blur(4px)',
                display: 'block',
              }}>
                {formatCurrency(primerPremio.valor_estimado)}
              </span>
            </div>
          ) : null}
        </div>

        {/* Info */}
        <div className="flex flex-col flex-1 p-1.5 lg:p-4">
          <a
            href={`/sorteo/${sorteo.id}`}
            onClick={irADetalle}
            className="lg:text-lg hover:underline"
            style={{ color: '#fff', fontSize: 12, fontWeight: 800, lineHeight: 1.2, marginBottom: 3, display: 'block', textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
          >
            {primerPremio?.nombre ?? sorteo.nombre}
          </a>
          {primerPremio?.valor_estimado && (
            <div className="hidden lg:block" style={{ marginBottom: 10 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                background: 'rgba(249,115,22,0.2)', border: '1px solid rgba(249,115,22,0.4)',
                color: '#fdba74', borderRadius: 5, padding: '2px 7px',
                fontSize: 10, fontWeight: 700,
              }}>
                Valor: {formatCurrency(primerPremio.valor_estimado)}
              </span>
            </div>
          )}

          {/* Progress — solo desktop */}
          <div className="hidden lg:block" style={{ marginBottom: 10 }}>
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

          {/* Countdown — mobile: solo días / desktop: los 4 */}
          <div className="lg:hidden" style={{ marginBottom: 8 }}>
            <div style={{ background: '#fff', borderRadius: 4, padding: '4px 6px', textAlign: 'center', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#14532d', lineHeight: 1 }}>{String(t.d).padStart(2, '0')}</p>
              <p style={{ fontSize: 8, color: '#6B7280', fontWeight: 500 }}>días restantes</p>
            </div>
          </div>
          <div className="hidden lg:grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 4, marginBottom: 12 }}>
            {[{ v: t.d, l: 'días' }, { v: t.h, l: 'hrs' }, { v: t.m, l: 'min' }, { v: t.s, l: 'seg' }].map(({ v, l }) => (
              <div key={l} style={{ background: '#fff', borderRadius: 5, padding: '6px 3px', textAlign: 'center' }}>
                <p style={{ fontSize: 17, fontWeight: 800, color: '#14532d', lineHeight: 1 }}>{String(v).padStart(2, '0')}</p>
                <p style={{ fontSize: 9, color: '#6B7280', marginTop: 2, fontWeight: 500 }}>{l}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('destacado:participar', { detail: { sorteoId: sorteo.id } }))}
            style={{
              width: '100%', padding: '7px 0',
              background: '#F97316', color: '#fff',
              fontSize: 11, fontWeight: 800,
              borderRadius: 5, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              transition: 'opacity 0.15s', marginTop: 'auto',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            <Ticket style={{ width: 11, height: 11 }} />
            Participar
          </button>
        </div>
      </div>

      {/* WhatsApp link — solo visible en desktop */}
      <a
        href="https://wa.me/3317385212?text=Quiero%20ser%20Destacado"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden lg:block"
        style={{
          textAlign: 'center',
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
export function HeroSection({ slides, sorteoDestacado, ctaBannerUrl }: HeroSectionProps) {
  return (
    <section id="inicio" style={{ background: '#1c1c1c' }}>
      {/* Slider + Featured card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-[7fr_3fr] lg:grid-cols-[minmax(0,1fr)_290px] gap-2 lg:gap-[3px]">
          <HeroSlider slides={slides} />
          {sorteoDestacado
            ? <FeaturedSorteoCard sorteo={sorteoDestacado} />
            : <NoFeaturedCard />
          }
        </div>
      </div>

      {/* CTA bar — oculto en móvil, visible desde sm */}
      <div className="hidden sm:block" style={{ background: '#1c1c1c', paddingBottom: 20 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {ctaBannerUrl ? (
            <div className="relative w-full overflow-hidden" style={{ borderRadius: '0 0 10px 10px', height: 100 }}>
              <Image src={ctaBannerUrl} alt="Banner CTA" fill style={{ objectFit: 'cover' }} priority />
            </div>
          ) : (
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
                    <p className="text-xs sm:text-base" style={{ color: '#fff', fontWeight: 700, lineHeight: 1.3 }}>
                      {label}
                    </p>
                    <p className="hidden sm:block" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>
                      {sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
