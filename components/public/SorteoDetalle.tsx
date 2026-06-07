'use client'

import { useState } from 'react'
import { SorteoCard } from './SorteoCard'
import { FormularioCompra } from './FormularioCompra'
import { OrganizadorInfo } from './OrganizadorInfo'
import { anuncioGanador } from '@/lib/sorteoTexto'
import type { Database } from '@/types/database.types'

type Sorteo = Database['public']['Tables']['sorteos']['Row'] & {
  premios: Database['public']['Tables']['premios']['Row'][]
  boletos_vendidos?: number
}

type Organizador = Pick<Database['public']['Tables']['perfiles']['Row'], 'nombre' | 'apellidos' | 'avatar_url' | 'calificacion' | 'verificado' | 'created_at'>

interface Paquete {
  cantidad: number
  label: string
  destacado?: boolean
}

interface ConteoOrganizador {
  activos: number
  finalizados: number
}

export function SorteoDetalle({ sorteo, organizador, conteoOrganizador }: { sorteo: Sorteo; organizador?: Organizador | null; conteoOrganizador?: ConteoOrganizador }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState<Paquete | null>(null)

  const handleParticipar = (_sorteo: Sorteo, paquete: Paquete) => {
    setPaqueteSeleccionado(paquete)
    setModalOpen(true)
  }

  const esLoteria = !!(sorteo as any).es_loteria

  return (
    <section className="py-12 sm:py-16" style={{ background: '#1c1c1c' }}>
      {/* Encabezado dinámico — nombre y descripción del sorteo */}
      <div className="max-w-lg mx-auto px-4 text-center mb-8 sm:mb-10">
        <h1
          className="font-title text-white"
          style={{ fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', letterSpacing: '0.02em', marginBottom: 10, lineHeight: 1.2 }}
        >
          {sorteo.nombre}
        </h1>

        {sorteo.descripcion && (
          <p className="font-body" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
            {sorteo.descripcion}
          </p>
        )}

        <div
          className="inline-flex items-start gap-2.5 mx-auto text-left"
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, padding: '10px 14px', maxWidth: 440,
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{esLoteria ? '🎰' : '📱'}</span>
          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12.5, lineHeight: 1.55 }}>
            {anuncioGanador(esLoteria)}
          </span>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4">
        <SorteoCard sorteo={sorteo} onParticipar={handleParticipar} />
      </div>

      {organizador && (
        <OrganizadorInfo organizador={organizador} conteo={conteoOrganizador ?? { activos: 0, finalizados: 0 }} />
      )}

      {paqueteSeleccionado && (
        <FormularioCompra
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          sorteo={sorteo}
          paqueteInicial={paqueteSeleccionado}
        />
      )}
    </section>
  )
}
