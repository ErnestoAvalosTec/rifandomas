'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ChevronDown, ChevronUp, ShoppingCart, TrendingUp } from 'lucide-react'
import { PedidosSoloLectura, type PedidoArchivado } from './PedidosSoloLectura'

export interface SorteoReporte {
  id: string
  nombre: string
  estatus: string
  fecha_sorteo: string
  organizador?: string
  pedidosTotales: number
  ingresosPagados: number
  pedidos: PedidoArchivado[]
}

export function ReportesSorteosList({ sorteos }: { sorteos: SorteoReporte[] }) {
  const [expandido, setExpandido] = useState<string | null>(null)

  if (!sorteos.length) {
    return (
      <div className="bg-brand-card border border-brand-border rounded-2xl p-12 text-center">
        <p className="text-brand-muted font-body text-sm">No hay sorteos finalizados o pausados todavía.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sorteos.map((s) => (
        <div key={s.id} className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setExpandido(expandido === s.id ? null : s.id)}
            className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left cursor-pointer"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-ui font-semibold text-white text-sm sm:text-base truncate">{s.nombre}</p>
                <Badge variant={s.estatus as any}>{s.estatus}</Badge>
              </div>
              <p className="text-xs text-brand-muted font-body">
                {formatDate(s.fecha_sorteo)}
                {s.organizador && <> · {s.organizador}</>}
              </p>
              <div className="sm:hidden flex items-center gap-3 mt-1">
                <span className="text-xs text-brand-muted">{s.pedidosTotales} pedidos</span>
                <span className="text-xs text-primary font-semibold">{formatCurrency(s.ingresosPagados)}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-brand-muted flex items-center gap-1 justify-end"><ShoppingCart className="w-3 h-3" />Pedidos</p>
                <p className="font-ui font-semibold text-white">{s.pedidosTotales}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs text-brand-muted flex items-center gap-1 justify-end"><TrendingUp className="w-3 h-3" />Ingresos</p>
                <p className="font-ui font-semibold text-primary">{formatCurrency(s.ingresosPagados)}</p>
              </div>
              {expandido === s.id ? <ChevronUp className="w-4 h-4 text-brand-muted" /> : <ChevronDown className="w-4 h-4 text-brand-muted" />}
            </div>
          </button>

          {expandido === s.id && (
            <div className="border-t border-brand-border p-4 sm:p-5">
              <PedidosSoloLectura pedidos={s.pedidos} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
