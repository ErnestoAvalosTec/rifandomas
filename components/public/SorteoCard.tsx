'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Clock, Ticket, ChevronRight, Share2, Banknote, Trophy } from 'lucide-react'
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
  finalizado?: boolean
  // Atenúa la tarjeta a gris hasta que el ancestro más cercano con class="group"
  // reciba hover/focus. No usar `filter` en el wrapper externo para lograr esto:
  // un `filter` en cualquier ancestro de la imagen flotante de escritorio
  // (.premio-imagen, position:absolute con offset negativo) rompe su recorte
  // (ver app/globals.css .card-premio/.premio-imagen). Por eso el gris se aplica
  // aquí, directo sobre objetivos seguros (imagen, overlay de contenido).
  desaturarHastaHover?: boolean
}

const MEDAL: Record<number, string> = { 1: '🏆', 2: '🥈', 3: '🥉' }
const LUGAR: Record<number, string> = { 1: '1er Premio', 2: '2do Premio', 3: '3er Premio', 4: '4to Premio', 5: '5to Premio' }

// Stack card shades — each layer noticeably darker to read as "card behind card"
const STACK_2_BG = '#0b4520'
const STACK_3_BG = '#062d12'
// Sorteos finalizados usan tonos grises en vez de verdes, para no asomar color detrás de la tarjeta desaturada
const STACK_2_BG_GRIS = '#333333'
const STACK_3_BG_GRIS = '#242424'

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

function NavLoadingOverlay({ radius }: { radius: number }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      background: 'rgba(10,10,10,0.82)',
      borderRadius: radius,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 10,
      animation: 'rf-fadein 0.15s ease',
    }}>
      <div style={{
        width: 30, height: 30,
        border: '2.5px solid rgba(255,255,255,0.1)',
        borderTopColor: '#0C9646',
        borderRadius: '50%',
        animation: 'rf-spin 0.75s linear infinite',
      }} />
      <span style={{
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13, fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        Cargando
      </span>
    </div>
  )
}

export function SorteoCard({ sorteo, onParticipar, finalizado = false, desaturarHastaHover = false }: SorteoCardProps) {
  const router = useRouter()
  const premios = sorteo.premios?.slice().sort((a, b) => a.lugar - b.lugar) ?? []
  const paquetes = buildPaquetes(sorteo)
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState<Paquete>(paquetes[1] ?? paquetes[0])
  const [premioIndex, setPremioIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const [navigating, setNavigating] = useState(false)
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

  const irADetalle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setNavigating(true)
    router.push(`/sorteo/${sorteo.id}`)
  }

  const handleCompartir = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${window.location.origin}/sorteo/${sorteo.id}`
    const datos = {
      title: sorteo.nombre,
      text: `¡Participa en el sorteo "${sorteo.nombre}" y gana grandes premios! 🎉`,
      url,
    }
    if (navigator.share) {
      try { await navigator.share(datos) } catch { /* usuario canceló */ }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('¡Enlace copiado! Ya puedes compartirlo.')
    } catch {
      toast.error('No se pudo copiar el enlace')
    }
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
    <>
      {/* ── MOBILE COMPACT (muestra 2 por fila en celular) ── */}
      <div
        className={`sm:hidden rounded-xl overflow-hidden border border-white/10 ${desaturarHastaHover ? 'grayscale group-hover:grayscale-0 group-focus-visible:grayscale-0 transition-[filter] duration-300' : ''}`}
        style={{ background: '#166534', position: 'relative' }}
      >
        {navigating && <NavLoadingOverlay radius={12} />}
        {/* Imagen — tappable para cambiar premio */}
        <div
          className="relative w-full"
          style={{ aspectRatio: '4 / 3', background: '#0f4a26', cursor: totalPremios > 1 ? 'pointer' : 'default' }}
          onClick={totalPremios > 1 ? irAlSiguiente : undefined}
        >
          <div style={fadeOpacity} className="absolute inset-0">
            {premioActual?.imagen_url ? (
              <Image src={premioActual.imagen_url} alt={premioActual.nombre} fill className="object-contain p-2" priority />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Ticket className="w-6 h-6 text-white/30" />
              </div>
            )}
          </div>

          {/* Badge de premio — esquina superior izquierda (solo multi-premio) */}
          {totalPremios > 1 && (
            <span className="absolute top-1.5 left-1.5" style={{
              background: 'rgba(0,0,0,0.6)', color: '#fff',
              borderRadius: 4, padding: '2px 6px',
              fontSize: 11, fontWeight: 800, lineHeight: 1,
              backdropFilter: 'blur(4px)',
            }}>
              {MEDAL[premioActual?.lugar ?? 1] ? `${MEDAL[premioActual?.lugar ?? 1]} ` : ''}{LUGAR[premioActual?.lugar ?? 1]}
            </span>
          )}

          {/* Badge de precio — esquina inferior izquierda */}
          <span className="absolute bottom-1.5 left-1.5" style={{
            background: '#F97316', color: '#fff',
            borderRadius: 4, padding: '2px 6px',
            fontSize: 12, fontWeight: 800, lineHeight: 1,
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}>
            {formatCurrency(sorteo.precio_unitario)}<span style={{ fontWeight: 300, fontSize: 10, marginLeft: 2, opacity: 0.85 }}>/boleto</span>
          </span>

          {/* Badge valor estimado — esquina inferior derecha */}
          {premioActual?.valor_estimado ? (
            <span className="absolute bottom-1.5 right-1.5" style={{
              background: 'rgba(0,0,0,0.72)',
              border: '1px solid rgba(249,115,22,0.55)',
              color: '#fdba74',
              borderRadius: 4, padding: '2px 5px',
              fontSize: 11, fontWeight: 700, lineHeight: 1,
              backdropFilter: 'blur(4px)',
            }}>
              Valor: {formatCurrency(premioActual.valor_estimado)}
            </span>
          ) : null}

          {/* Contador — esquina superior derecha */}
          {totalPremios > 1 && (
            <span className="absolute top-1.5 right-1.5" style={{
              background: 'rgba(0,0,0,0.55)', color: '#fff',
              borderRadius: 99, padding: '2px 6px',
              fontSize: 11, fontWeight: 800, lineHeight: 1,
              display: 'flex', alignItems: 'center', gap: 2,
            }}>
              {premioIndex + 1}/{totalPremios} <ChevronRight style={{ width: 8, height: 8, display: 'inline' }} />
            </span>
          )}

          {/* Lleno — solo si no tiene contador encima */}
          {porcentaje >= 80 && totalPremios <= 1 && !finalizado && (
            <span className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full px-1 py-px animate-pulse" style={{ fontSize: 10, fontWeight: 700 }}>¡Lleno!</span>
          )}

          {/* Dots de posición — más visibles */}
          {totalPremios > 1 && (
            <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
              {premios.map((_, idx) => (
                <span key={idx} style={{
                  width: idx === premioIndex ? 14 : 5, height: 5,
                  borderRadius: 3,
                  background: idx === premioIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.25s',
                  display: 'inline-block',
                }} />
              ))}
            </div>
          )}
        </div>

        {/* Contenido */}
        <div style={{ padding: '7px 7px 8px' }}>

          {/* Título + descripción — llevan a la página informativa del sorteo */}
          <div onClick={irADetalle} style={{ cursor: 'pointer' }} title="Ver información del sorteo">
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, lineHeight: 1.2, marginBottom: 2 }}
              className="line-clamp-1">
              {premioActual?.nombre ?? sorteo.nombre}
            </h3>

            {premioActual?.descripcion && (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.3, marginBottom: 4 }}
                className="line-clamp-1">
                {premioActual.descripcion}
              </p>
            )}
          </div>

          {/* Badge intercambiable — móvil */}
          {premioActual?.intercambiable_efectivo && (
            <div style={{ marginBottom: 5 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                background: 'rgba(12, 150, 70,0.18)',
                border: '1px solid rgba(12, 150, 70,0.35)',
                color: '#0C9646',
                borderRadius: 4, padding: '3px 6px',
                fontSize: 11, fontWeight: 700, lineHeight: 1,
              }}>
                <Banknote style={{ width: 9, height: 9 }} />
                O equivalente en efectivo
              </span>
            </div>
          )}

          {/* Barra de progreso + vendidos */}
          <div style={{ marginBottom: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 300 }}>
                <strong style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>{vendidos.toLocaleString('es-MX')}</strong>/{sorteo.total_numeros.toLocaleString('es-MX')} vend.
              </span>
              <span style={{ color: '#0C9646', fontSize: 14, fontWeight: 800 }}>{porcentaje}%</span>
            </div>
            <div style={{ height: 3, background: 'rgba(0,0,0,0.3)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${porcentaje}%`, background: '#0C9646', borderRadius: 2 }} />
            </div>
          </div>

          {/* Countdown — 4 pastillas */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
            {[
              { val: countdown.days,    label: 'd' },
              { val: countdown.hours,   label: 'h' },
              { val: countdown.minutes, label: 'm' },
              { val: countdown.seconds, label: 's' },
            ].map(({ val, label }) => (
              <div key={label} style={{
                flex: 1, background: 'rgba(255,255,255,0.15)',
                borderRadius: 4, padding: '4px 1px', textAlign: 'center',
              }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{String(val).padStart(2, '0')}</p>
                <p style={{ fontSize: 9, fontWeight: 300, color: 'rgba(255,255,255,0.5)', marginTop: 2, letterSpacing: '0.03em' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* CTA + compartir */}
          <div style={{ display: 'flex', gap: 5 }}>
            {finalizado ? (
              <div style={{
                flex: 1, padding: '7px 0',
                background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)',
                fontSize: 14, fontWeight: 700,
                borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
              }}>
                <Trophy style={{ width: 10, height: 10 }} />
                Sorteo finalizado
              </div>
            ) : (
              <button
                onClick={() => onParticipar(sorteo, paqueteSeleccionado)}
                style={{
                  flex: 1, padding: '7px 0',
                  background: '#EA580C',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  borderRadius: 6, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                }}
              >
                <Ticket style={{ width: 10, height: 10 }} />
                ¡Participar!
              </button>
            )}
            <button
              onClick={handleCompartir}
              aria-label="Compartir sorteo"
              style={{
                width: 30, flexShrink: 0,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 6, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Share2 style={{ width: 12, height: 12, color: '#fff' }} />
            </button>
          </div>
        </div>
      </div>

      {/* ── DESKTOP FULL (sm+) ── */}
      <div className="hidden sm:block relative" style={{ marginTop: 105 }}>

      {/* Stack card 3 */}
      {totalPremios > 2 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: finalizado ? STACK_3_BG_GRIS : STACK_3_BG,
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
          background: finalizado ? STACK_2_BG_GRIS : STACK_2_BG,
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          transform: 'translateX(5px) translateY(5px) rotate(1.2deg)',
          zIndex: 2,
        }} />
      )}

      {/* Main card */}
      <div className="card-premio" style={{ position: 'relative', zIndex: 3, marginTop: 0 }}>
        {navigating && <NavLoadingOverlay radius={20} />}

        {/* ── FLOATING IMAGE (outside the card, above it) ── */}
        <div style={fadeOpacity}>
          {premioActual?.imagen_url ? (
            <Image
              src={premioActual.imagen_url}
              alt={premioActual.nombre}
              width={210}
              height={210}
              className={`premio-imagen ${desaturarHastaHover ? 'grayscale group-hover:grayscale-0 group-focus-visible:grayscale-0 transition-[filter] duration-300' : ''}`}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 8, columnGap: 8, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
                color: '#fff', borderRadius: 999, padding: '4px 10px',
                fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
              }}>
                {LUGAR[premioActual?.lugar ?? 1]}
              </span>
              {porcentaje >= 80 && !finalizado && (
                <span style={{
                  background: '#EF4444', color: '#fff',
                  borderRadius: 999, padding: '4px 8px', fontSize: 13, fontWeight: 700,
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
                  color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999,
                  padding: '3px 8px', cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}>
                  {LUGAR[(premios[(premioIndex + 1) % totalPremios]?.lugar) ?? 1]}
                  <ChevronRight style={{ width: 10, height: 10 }} />
                </button>
              </div>
            )}
          </div>

          {/* Prize name + description + valor */}
          <div style={fadeContent}>
            {/* Nombre + descripción del premio — llevan a la página informativa del sorteo */}
            <div onClick={irADetalle} style={{ cursor: 'pointer' }} title="Ver información del sorteo">
              <h3 style={{
                color: '#fff', fontSize: 23, fontWeight: 800,
                lineHeight: 1.15, marginBottom: 4, letterSpacing: '-0.01em',
              }}>
                {premioActual?.nombre ?? sorteo.nombre}
              </h3>
              <p
                className="line-clamp-2"
                style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 300, lineHeight: 1.45, marginBottom: 10 }}
              >
                {premioActual?.descripcion ?? ''}
              </p>
            </div>

            {/* Precio por boleto — destacado, arriba de las estadísticas */}
            <div style={{ marginBottom: 10 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'baseline', gap: 5,
                background: '#FBBF24', color: '#1c1c1c',
                borderRadius: 8, padding: '6px 12px',
              }}>
                <strong style={{ fontWeight: 800, fontSize: 18 }}>{formatCurrency(sorteo.precio_unitario)}</strong>
                <span style={{ fontWeight: 500, fontSize: 12 }}>por boleto · Precio fijo</span>
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 10, minHeight: 28 }}>
              {premioActual?.valor_estimado ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: '#F97316', color: '#fff',
                  borderRadius: 999, padding: '4px 10px',
                  fontSize: 14, fontWeight: 700,
                }}>
                  Valor: {formatCurrency(premioActual.valor_estimado)}
                </span>
              ) : null}
              {premioActual?.intercambiable_efectivo && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'rgba(12, 150, 70,0.18)',
                  border: '1px solid rgba(12, 150, 70,0.4)',
                  color: '#0C9646',
                  borderRadius: 999, padding: '4px 10px',
                  fontSize: 13, fontWeight: 700,
                }}>
                  <Banknote style={{ width: 12, height: 12 }} />
                  O equivalente en efectivo
                </span>
              )}
            </div>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 300 }}>
                <strong style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>{vendidos.toLocaleString('es-MX')}</strong> de {sorteo.total_numeros.toLocaleString('es-MX')} vendidos
              </span>
              <span style={{ color: '#0C9646', fontSize: 16, fontWeight: 800 }}>
                {porcentaje}<span style={{ fontSize: 12, fontWeight: 400 }}>% vendido</span>
              </span>
            </div>
            <div style={{ height: 5, background: 'rgba(0,0,0,0.25)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${porcentaje}%`,
                background: '#0C9646',
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
              <Clock style={{ width: 11, height: 11, color: '#0C9646' }} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 300 }}>Sorteo en:</span>
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
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#14532d', lineHeight: 1 }}>
                    {String(val).padStart(2, '0')}
                  </p>
                  <p style={{ fontSize: 10, color: '#6B7280', marginTop: 3, fontWeight: 300, letterSpacing: '0.03em' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA — orange + compartir */}
          <div style={{ display: 'flex', gap: 8 }}>
            {finalizado ? (
              <div style={{
                flex: 1, padding: '12px 0',
                background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)',
                fontSize: 18, fontWeight: 700,
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}>
                <Trophy style={{ width: 16, height: 16 }} />
                Sorteo finalizado
              </div>
            ) : (
              <button
                onClick={() => onParticipar(sorteo, paqueteSeleccionado)}
                style={{
                  flex: 1, padding: '12px 0',
                  background: '#EA580C',
                  color: '#fff', fontSize: 18, fontWeight: 700,
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
            )}
            <button
              onClick={handleCompartir}
              aria-label="Compartir sorteo"
              title="Compartir sorteo"
              style={{
                width: 46, flexShrink: 0,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            >
              <Share2 style={{ width: 16, height: 16, color: '#fff' }} />
            </button>
          </div>

        </div>

        {/* Overlay gris sobre el fondo/contenido de la tarjeta (no la imagen flotante,
            que queda fuera de esta caja) — evita usar `filter` aquí para no romper
            el recorte de .premio-imagen (ver nota en SorteoCardProps). */}
        {desaturarHastaHover && (
          <div
            className="absolute inset-0 rounded-[20px] pointer-events-none opacity-100 group-hover:opacity-0 group-focus-visible:opacity-0 transition-opacity duration-300"
            style={{ background: '#8a8a8a', mixBlendMode: 'saturation' }}
          />
        )}
      </div>
    </div>
    </>
  )
}
