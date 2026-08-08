'use client'

import { useState, useEffect, useTransition } from 'react'
import { SorteoCard } from './SorteoCard'
import { FiltroPanel, type Filtros } from './FiltroPanel'
import { FormularioCompra } from './FormularioCompra'
import type { Database } from '@/types/database.types'

const CATEGORY_EMOJI_MAP: Record<string, string> = {
  'tecnologia': '💻', 'tecnología': '💻',
  'electronica': '📱', 'electrónica': '📱', 'celular': '📱', 'celulares': '📱',
  'auto': '🚗', 'automovil': '🚗', 'automóvil': '🚗', 'carro': '🚗', 'autos': '🚗',
  'moto': '🏍️', 'motos': '🏍️',
  'viaje': '✈️', 'viajes': '✈️',
  'efectivo': '💰', 'dinero': '💵', 'cash': '💵',
  'joyeria': '💎', 'joyería': '💎', 'joya': '💎', 'joyas': '💎',
  'ropa': '👗', 'moda': '👟',
  'hogar': '🏠', 'casa': '🏠',
  'deporte': '🏆', 'deportes': '⚽',
  'juguete': '🧸', 'juguetes': '🧸',
  'musica': '🎵', 'música': '🎵',
  'arte': '🎨',
  'comida': '🍕', 'alimentos': '🍕',
  'mascota': '🐾', 'mascotas': '🐾',
  'gaming': '🎮', 'videojuegos': '🎮', 'juegos': '🎮',
  'salud': '💊',
  'belleza': '💄',
  'boletos': '🎟️',
  'experiencia': '⭐', 'experiencias': '⭐',
  'telefono': '📞', 'teléfono': '📞',
}

function getCategoryEmoji(cat: string): string {
  const key = cat.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  for (const [k, v] of Object.entries(CATEGORY_EMOJI_MAP)) {
    const norm = k.normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (key === norm || key.includes(norm) || norm.includes(key)) return v
  }
  return '🎁'
}

type Sorteo = Database['public']['Tables']['sorteos']['Row'] & {
  premios: Database['public']['Tables']['premios']['Row'][]
  boletos_vendidos?: number
}

interface Paquete {
  cantidad: number
  label: string
  destacado?: boolean
}

interface SorteosGridProps {
  sorteos: Sorteo[]
}

export function SorteosGrid({ sorteos }: SorteosGridProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [sorteoSeleccionado, setSorteoSeleccionado] = useState<Sorteo | null>(null)
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState<Paquete | null>(null)
  const [filtros, setFiltros] = useState<Filtros>({ categoria: '', precioMin: '', precioMax: '' })
  const [isPending, startTransition] = useTransition()

  const aplicarFiltro = (newFiltros: Filtros) => {
    startTransition(() => setFiltros(newFiltros))
  }

  const handleParticipar = (sorteo: Sorteo, paquete: Paquete) => {
    setSorteoSeleccionado(sorteo)
    setPaqueteSeleccionado(paquete)
    setModalOpen(true)
  }

  useEffect(() => {
    const handler = (e: Event) => {
      const sorteoId = (e as CustomEvent<{ sorteoId: string }>).detail?.sorteoId
      const sorteo = sorteos.find(s => s.id === sorteoId)
      if (sorteo) handleParticipar(sorteo, { cantidad: 1, label: '1 boleto' })
    }
    window.addEventListener('destacado:participar', handler)
    return () => window.removeEventListener('destacado:participar', handler)
  }, [sorteos])

  // Extract unique categories present in active sorteos
  const categoriasDisponibles = Array.from(new Set(
    sorteos.flatMap(s =>
      s.premios?.map(p => (p as any).categoria as string | null).filter((c): c is string => !!c) ?? []
    )
  )).sort()

  // Apply filters
  const sorteosFiltrados = sorteos.filter(s => {
    if (filtros.categoria) {
      const tieneCat = s.premios?.some(p => (p as any).categoria === filtros.categoria)
      if (!tieneCat) return false
    }
    if (filtros.precioMin !== '' && !isNaN(Number(filtros.precioMin))) {
      if (s.precio_unitario < Number(filtros.precioMin)) return false
    }
    if (filtros.precioMax !== '' && !isNaN(Number(filtros.precioMax))) {
      if (s.precio_unitario > Number(filtros.precioMax)) return false
    }
    return true
  })

  if (!sorteos.length) {
    return (
      <section id="sorteos" className="py-16" style={{ background: '#1c1c1c' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="font-body text-lg" style={{ color: 'rgba(255,255,255,0.5)' }}>No hay sorteos activos en este momento.</p>
          <p className="font-body text-sm mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>¡Vuelve pronto!</p>
        </div>
      </section>
    )
  }

  return (
    <>
      {/* Floating filter panel — oculto en móvil */}
      <div className="hidden sm:block">
        <FiltroPanel
          categoriasDisponibles={categoriasDisponibles}
          filtros={filtros}
          onChange={aplicarFiltro}
          resultados={sorteosFiltrados.length}
          total={sorteos.length}
        />
      </div>

      <section id="sorteos" className="py-16" style={{ background: '#1c1c1c' }}>
        <div className="max-w-7xl mx-auto px-2 sm:px-6">

          {/* Encabezado SEO */}
          <div className="mb-8 sm:mb-10 text-center">
            <h2 className="font-title text-white" style={{ fontSize: 'clamp(1.9rem, 4.2vw, 2.9rem)', fontWeight: 800, letterSpacing: '0.01em', marginBottom: 10 }}>
              SORTEOS ACTIVOS
            </h2>
            <p className="font-body mx-auto" style={{ color: 'rgba(255,255,255,0.48)', fontSize: 'clamp(16px, 2vw, 18px)', fontWeight: 300, letterSpacing: '0.01em', maxWidth: 520 }}>
              Elige tu sorteo, adquiere tus boletos y participa por grandes premios. Resultados 100% transparentes.
            </p>
          </div>

          {/* Category slider — solo móvil */}
          <div className="sm:hidden -mx-4 px-4 mb-4">
            <div
              className="scrollbar-hide flex gap-1 overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
            >
              {[{ key: '', label: 'Todos', emoji: '🏷️' }, ...categoriasDisponibles.map(c => ({ key: c, label: c, emoji: getCategoryEmoji(c) }))].map(({ key, label, emoji }) => {
                const active = filtros.categoria === key
                return (
                  <button
                    key={key || '__todos__'}
                    onClick={() => aplicarFiltro({ ...filtros, categoria: key })}
                    className="flex flex-col items-center flex-shrink-0 cursor-pointer"
                    style={{ minWidth: 58, gap: 4, background: 'none', border: 'none', padding: '2px 0' }}
                  >
                    <div style={{
                      width: 68, height: 68,
                      borderRadius: '50%',
                      background: active ? 'rgba(12, 150, 70,0.18)' : 'rgba(255,255,255,0.07)',
                      border: `2px solid ${active ? '#0C9646' : 'transparent'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 38,
                      transition: 'all 0.15s',
                    }}>
                      {emoji}
                    </div>
                    <span style={{
                      fontSize: 13,
                      fontWeight: active ? 700 : 500,
                      color: active ? '#0C9646' : 'rgba(255,255,255,0.65)',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      maxWidth: 64,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ position: 'relative' }}>

            {/* Overlay de carga al filtrar */}
            {isPending && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'rf-fadein 0.15s ease',
                pointerEvents: 'none',
              }}>
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 10,
                  background: 'rgba(28,28,28,0.82)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, padding: '18px 28px',
                }}>
                  <div style={{
                    width: 28, height: 28,
                    border: '2.5px solid rgba(255,255,255,0.1)',
                    borderTopColor: '#0C9646',
                    borderRadius: '50%',
                    animation: 'rf-spin 0.75s linear infinite',
                  }} />
                  <span style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 13, fontWeight: 600,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>Filtrando</span>
                </div>
              </div>
            )}

            {sorteosFiltrados.length === 0 ? (
              <div className="text-center py-20">
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 19, marginBottom: 8 }}>
                  Ningún sorteo coincide con los filtros aplicados.
                </p>
                <button
                  onClick={() => aplicarFiltro({ categoria: '', precioMin: '', precioMax: '' })}
                  style={{
                    color: '#0C9646', fontSize: 16, fontWeight: 600,
                    background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div
                className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 items-start"
                style={{ opacity: isPending ? 0.45 : 1, transition: 'opacity 0.2s ease' }}
              >
                {sorteosFiltrados.map(sorteo => (
                  <SorteoCard key={sorteo.id} sorteo={sorteo} onParticipar={handleParticipar} />
                ))}
              </div>
            )}

          </div>

        </div>
      </section>

      {sorteoSeleccionado && paqueteSeleccionado && (
        <FormularioCompra
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          sorteo={sorteoSeleccionado}
          paqueteInicial={paqueteSeleccionado}
        />
      )}
    </>
  )
}
