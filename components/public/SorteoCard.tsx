'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'
import { Clock, Ticket, ChevronRight } from 'lucide-react'
import type { Database } from '@/types/database.types'

type Sorteo = Database['public']['Tables']['sorteos']['Row'] & {
  premios: Database['public']['Tables']['premios']['Row'][]
  boletos_vendidos?: number
}

interface Paquete {
  cantidad: number
  label: string
  destacado?: boolean
}

interface SorteoCardProps {
  sorteo: Sorteo
  onParticipar: (sorteo: Sorteo, paquete: Paquete) => void
}

const MEDAL: Record<number, string> = { 1: '🏆', 2: '🥈', 3: '🥉' }
const LUGAR: Record<number, string> = { 1: '1er Premio', 2: '2do Premio', 3: '3er Premio' }

// Stack card shades — each layer noticeably darker to read as "card behind card"
const STACK_2_BG = '#0b4520'
const STACK_3_BG = '#062d12'

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now()
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [targetDate])
  return timeLeft
}

function buildPaquetes(sorteo: Sorteo): Paquete[] {
  if (sorteo.promo_activa && sorteo.promo_tipo === 'x_por_y' && sorteo.promo_config) {
    const cfg = sorteo.promo_config as { compra: number; paga: number }[]
    return cfg.map((p) => ({
      cantidad: p.compra,
      label: `${p.compra} × ${formatCurrency(sorteo.precio_unitario * p.paga)}`,
      destacado: p.compra === cfg[1]?.compra,
    }))
  }
  const precio = sorteo.precio_unitario
  return [
    { cantidad: 1, label: `1 boleto — ${formatCurrency(precio)}` },
    { cantidad: 3, label: `3 boletos — ${formatCurrency(precio * 3)}`, destacado: true },
    { cantidad: 5, label: `5 boletos — ${formatCurrency(precio * 5)}` },
    { cantidad: 10, label: `10 boletos — ${formatCurrency(precio * 10)}` },
  ]
}

export function SorteoCard({ sorteo, onParticipar }: SorteoCardProps) {
  const premios = sorteo.premios?.slice().sort((a, b) => a.lugar - b.lugar) ?? []
  const paquetes = buildPaquetes(sorteo)
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState<Paquete>(paquetes[1] ?? paquetes[0])
  const [premioIndex, setPremioIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const countdown = useCountdown(sorteo.fecha_sorteo)
  const vendidos = sorteo.boletos_vendidos ?? 0
  const porcentaje = Math.round((vendidos / sorteo.total_numeros) * 100)

  const premioActual = premios[premioIndex] ?? premios[0]
  const totalPremios = premios.length

  const irAlSiguiente = () => {
    if (totalPremios <= 1) return
    setVisible(false)
    setTimeout(() => { setPremioIndex((prev) => (prev + 1) % totalPremios); setVisible(true) }, 180)
  }

  const irAPremio = (idx: number) => {
    if (idx === premioIndex) return
    setVisible(false)
    setTimeout(() => { setPremioIndex(idx); setVisible(true) }, 180)
  }

  // Opacity-only fade — never use transform on the image wrapper (would break absolute positioning)
  const fadeOpacity = { transition: 'opacity 180ms ease', opacity: visible ? 1 : 0 }
  // Slide+fade for text content
  const fadeContent = {
    transition: 'opacity 180ms ease, transform 180ms ease',
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(6px)',
  }

  return (
    <div className="relative" style={{ marginTop: 105 }}>

      {/* Stack card 3 */}
      {totalPremios > 2 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: STACK_3_BG,
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 20,
          transform: 'translateX(10px) translateY(10px) rotate(2.5deg)',
          zIndex: 1,
        }} />
      )}
      {/* Stack card 2 */}
      {totalPremios > 1 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: STACK_2_BG,
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          transform: 'translateX(5px) translateY(5px) rotate(1.2deg)',
          zIndex: 2,
        }} />
      )}

      {/* Main card */}
      <div className="card-premio" style={{ position: 'relative', zIndex: 3, marginTop: 0 }}>

        {/* ── FLOATING IMAGE (outside the card, above it) ── */}
        <div style={fadeOpacity}>
          {premioActual?.imagen_url ? (
            <Image
              src={premioActual.imagen_url}
              alt={premioActual.nombre}
              width={210}
              height={210}
              className="premio-imagen"
              priority
            />
          ) : (
            <div className="premio-imagen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: 120, height: 120, borderRadius: 20,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Ticket style={{ width: 56, height: 56, color: 'rgba(255,255,255,0.4)' }} />
              </div>
            </div>
          )}
        </div>

        {/* ── CARD CONTENT ── */}
        <div style={{ padding: '4px 14px 14px' }}>

          {/* Prize badge + navigation row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
                color: '#fff', borderRadius: 999, padding: '4px 10px',
                fontSize: 11, fontWeight: 700,
              }}>
                {MEDAL[premioActual?.lugar ?? 1]} {LUGAR[premioActual?.lugar ?? 1]}
              </span>
              {porcentaje >= 80 && (
                <span style={{
                  background: '#EF4444', color: '#fff',
                  borderRadius: 999, padding: '4px 8px', fontSize: 10, fontWeight: 700,
                }} className="animate-pulse">¡Casi lleno!</span>
              )}
            </div>

            {/* Multi-prize navigation */}
            {totalPremios > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {premios.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => irAPremio(idx)}
                      style={{
                        width: idx === premioIndex ? 18 : 6, height: 6,
                        borderRadius: 3,
                        background: idx === premioIndex ? '#fff' : 'rgba(255,255,255,0.35)',
                        border: 'none', cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    />
                  ))}
                </div>
                <button onClick={irAlSiguiente} style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  background: 'rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999,
                  padding: '3px 8px', cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}>
                  {MEDAL[(premios[(premioIndex + 1) % totalPremios]?.lugar) ?? 1]}
                  {' '}Ver {LUGAR[(premios[(premioIndex + 1) % totalPremios]?.lugar) ?? 1]}
                  <ChevronRight style={{ width: 10, height: 10 }} />
                </button>
              </div>
            )}
          </div>

          {/* Prize name + description + valor */}
          <div style={fadeContent}>
            <h3 style={{
              color: '#fff', fontSize: 19, fontWeight: 700,
              lineHeight: 1.2, marginBottom: 3, letterSpacing: '-0.01em',
            }}>
              {premioActual?.nombre ?? sorteo.nombre}
            </h3>
            <div style={{ height: 34, marginBottom: 8, overflow: 'hidden' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 1.45 }}>
                {premioActual?.descripcion ?? ''}
              </p>
            </div>
            {premioActual?.valor_estimado ? (
              <div style={{ marginBottom: 10 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: '#F97316', color: '#fff',
                  borderRadius: 999, padding: '4px 10px',
                  fontSize: 11, fontWeight: 700,
                }}>
                  🏷️ Valor: {formatCurrency(premioActual.valor_estimado)}
                </span>
              </div>
            ) : <div style={{ marginBottom: 10, height: 24 }} />}
          </div>

          {/* Progress */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: 500 }}>
                {vendidos.toLocaleString('es-MX')} vendidos
              </span>
              <span style={{ color: '#86EFAC', fontSize: 10, fontWeight: 600 }}>
                {porcentaje}% vendido
              </span>
            </div>
            <div style={{ height: 5, background: 'rgba(0,0,0,0.25)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${porcentaje}%`,
                background: '#4ADE80',
                borderRadius: 3, transition: 'width 0.4s ease',
              }} />
            </div>
          </div>

          {/* Countdown */}
          <div style={{
            background: 'rgba(0,0,0,0.18)',
            borderRadius: 10, padding: '8px 10px', marginBottom: 10,
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <Clock style={{ width: 11, height: 11, color: '#86EFAC' }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Sorteo en:</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
              {[
                { val: countdown.days, label: 'días' },
                { val: countdown.hours, label: 'hrs' },
                { val: countdown.minutes, label: 'min' },
                { val: countdown.seconds, label: 'seg' },
              ].map(({ val, label }) => (
                <div key={label} style={{
                  background: '#fff', borderRadius: 7,
                  padding: '6px 4px', textAlign: 'center',
                }}>
                  <p style={{ fontSize: 17, fontWeight: 800, color: '#14532d', lineHeight: 1 }}>
                    {String(val).padStart(2, '0')}
                  </p>
                  <p style={{ fontSize: 8, color: '#6B7280', marginTop: 2, fontWeight: 500 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA — orange */}
          <button
            onClick={() => onParticipar(sorteo, paqueteSeleccionado)}
            style={{
              width: '100%', padding: '12px 0',
              background: 'linear-gradient(135deg, #F97316, #EA580C)',
              color: '#fff', fontSize: 15, fontWeight: 700,
              borderRadius: 10, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            <Ticket style={{ width: 16, height: 16 }} />
            ¡Participar!
          </button>

          {/* Footer */}
          <p style={{
            textAlign: 'center', fontSize: 10,
            color: '#86EFAC', marginTop: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
            fontWeight: 500,
          }}>
            ✓ {formatCurrency(sorteo.precio_unitario)} por boleto · Precio fijo
          </p>
        </div>
      </div>
    </div>
  )
}
