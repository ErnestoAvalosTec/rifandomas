'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Ticket } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Premio { lugar: number; nombre: string; imagen_url: string | null; valor_estimado: number | null }
interface SorteoRel { id: string; nombre: string; precio_unitario: number; premios: Premio[] }

function MiniCard({ sorteo }: { sorteo: SorteoRel }) {
  const primer = sorteo.premios?.find(p => p.lugar === 1) ?? sorteo.premios?.[0]

  return (
    <Link
      href={`/sorteo/${sorteo.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 150,
        flexShrink: 0,
        background: '#1e1e1e',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 12,
        overflow: 'hidden',
        textDecoration: 'none',
        transition: 'border-color 0.15s, transform 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.borderColor = 'rgba(255,255,255,0.22)'
        el.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.borderColor = 'rgba(255,255,255,0.09)'
        el.style.transform = 'translateY(0)'
      }}
    >
      {/* Image */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1',
          background: '#166534',
          flexShrink: 0,
        }}
      >
        {primer?.imagen_url ? (
          <Image
            src={primer.imagen_url}
            alt={primer.nombre}
            fill
            style={{ objectFit: 'contain', padding: 10 }}
            sizes="150px"
            unoptimized
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ticket style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.25)' }} />
          </div>
        )}
        {/* Price badge */}
        <span
          style={{
            position: 'absolute',
            bottom: 6,
            left: 6,
            background: '#F97316',
            color: '#fff',
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: 12,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          {formatCurrency(sorteo.precio_unitario)}
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: '9px 10px 11px' }}>
        <p
          style={{
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {primer?.nombre ?? sorteo.nombre}
        </p>
        {primer?.valor_estimado ? (
          <p style={{ color: 'rgba(253,186,116,0.85)', fontSize: 13, fontWeight: 600, marginTop: 5 }}>
            {formatCurrency(primer.valor_estimado)}
          </p>
        ) : null}
      </div>
    </Link>
  )
}

export function SorteosRelacionados({ sorteoId }: { sorteoId: string }) {
  const [sorteos, setSorteos] = useState<SorteoRel[]>([])
  const [cargando, setCargando] = useState(true)
  const railRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/sorteos-relacionados?sorteo_id=${sorteoId}`)
      .then(r => r.json())
      .then(data => { setSorteos(Array.isArray(data) ? data : []); setCargando(false) })
      .catch(() => setCargando(false))
  }, [sorteoId])

  const scroll = (dir: 'left' | 'right') => {
    if (!railRef.current) return
    railRef.current.scrollBy({ left: dir === 'right' ? 340 : -340, behavior: 'smooth' })
  }

  if (cargando || sorteos.length === 0) return null

  return (
    <div
      className="max-w-2xl mx-auto px-4 mt-14"
      style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 48 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2
            className="font-title text-white"
            style={{ fontSize: 'clamp(1.3rem, 3vw, 1.7rem)', letterSpacing: '0.05em' }}
          >
            MÁS SORTEOS
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 15, marginTop: 2 }}>
            Sorteos que pueden interesarte
          </p>
        </div>
        {/* Arrows — desktop only */}
        <div className="hidden sm:flex" style={{ gap: 8 }}>
          {(['left', 'right'] as const).map(dir => (
            <button
              key={dir}
              onClick={() => scroll(dir)}
              aria-label={dir === 'left' ? 'Anterior' : 'Siguiente'}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#252525',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.6)',
                transition: 'border-color 0.15s, color 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
              }}
            >
              {dir === 'left'
                ? <ChevronLeft style={{ width: 16, height: 16 }} />
                : <ChevronRight style={{ width: 16, height: 16 }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Rail */}
      <div
        ref={railRef}
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: 4,
        }}
        className="scrollbar-hide"
      >
        {sorteos.map(s => (
          <div key={s.id} style={{ scrollSnapAlign: 'start' }}>
            <MiniCard sorteo={s} />
          </div>
        ))}
      </div>
    </div>
  )
}
