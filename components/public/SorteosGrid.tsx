'use client'

import { useState } from 'react'
import { SorteoCard } from './SorteoCard'
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

  const handleParticipar = (sorteo: Sorteo, paquete: Paquete) => {
    setSorteoSeleccionado(sorteo)
    setPaqueteSeleccionado(paquete)
    setModalOpen(true)
  }

  if (!sorteos.length) {
    return (
      <section id="sorteos" className="py-24 bg-brand-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-brand-muted font-body text-lg">No hay sorteos activos en este momento.</p>
          <p className="text-brand-muted font-body text-sm mt-2">¡Vuelve pronto!</p>
        </div>
      </section>
    )
  }

  return (
    <>
      <section id="sorteos" className="py-24 bg-brand-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-20">
            <p className="text-primary text-sm font-ui font-semibold uppercase tracking-widest mb-3">Disponibles ahora</p>
            <h2 className="font-title text-5xl sm:text-6xl text-white tracking-wide">
              SORTEOS ACTIVOS
            </h2>
            <p className="text-brand-muted font-body mt-4">
              Elige tu sorteo y participa para ganar premios increíbles.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
            {sorteos.map((sorteo) => (
              <SorteoCard key={sorteo.id} sorteo={sorteo} onParticipar={handleParticipar} />
            ))}
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
