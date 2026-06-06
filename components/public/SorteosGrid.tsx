'use client'

import { useState } from 'react'
import { SorteoCard } from './SorteoCard'
import { FiltroPanel, type Filtros } from './FiltroPanel'
import { FormularioCompra } from './FormularioCompra'
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

interface SorteosGridProps {
  sorteos: Sorteo[]
}

export function SorteosGrid({ sorteos }: SorteosGridProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [sorteoSeleccionado, setSorteoSeleccionado] = useState<Sorteo | null>(null)
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState<Paquete | null>(null)
  const [filtros, setFiltros] = useState<Filtros>({ categoria: '', precioMin: '', precioMax: '' })

  const handleParticipar = (sorteo: Sorteo, paquete: Paquete) => {
    setSorteoSeleccionado(sorteo)
    setPaqueteSeleccionado(paquete)
    setModalOpen(true)
  }

  // Extract unique categories present in active sorteos
  const categoriasDisponibles = Array.from(new Set(
    sorteos.flatMap(s =>
      s.premios?.map(p => (p as any).categoria as string | null).filter(Boolean) ?? []
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
      {/* Floating filter panel — appears in left gutter at 2xl+ */}
      <FiltroPanel
        categoriasDisponibles={categoriasDisponibles}
        filtros={filtros}
        onChange={setFiltros}
        resultados={sorteosFiltrados.length}
        total={sorteos.length}
      />

      <section id="sorteos" className="py-16" style={{ background: '#1c1c1c' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          {sorteosFiltrados.length === 0 ? (
            <div className="text-center py-20">
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, marginBottom: 8 }}>
                Ningún sorteo coincide con los filtros aplicados.
              </p>
              <button
                onClick={() => setFiltros({ categoria: '', precioMin: '', precioMax: '' })}
                style={{
                  color: '#4ADE80', fontSize: 13, fontWeight: 600,
                  background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 items-start">
              {sorteosFiltrados.map(sorteo => (
                <SorteoCard key={sorteo.id} sorteo={sorteo} onParticipar={handleParticipar} />
              ))}
            </div>
          )}

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
