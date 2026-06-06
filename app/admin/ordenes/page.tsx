'use client'

import { useEffect, useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import { Search } from 'lucide-react'

interface Orden {
  id: string
  cliente_nombre: string
  cliente_apellidos: string
  cliente_telefono: string
  cliente_estado: string | null
  monto_total: number
  estatus: 'pendiente' | 'pagado' | 'cancelado'
  created_at: string
  sorteos: { id: string; nombre: string } | null
  numeros: string[]
}

export default function AdminOrdenesPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState<string>('todos')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      const res = await fetch('/api/admin/ordenes')
      const data = await res.json()
      setOrdenes(Array.isArray(data) ? data : [])
      setCargando(false)
    }
    cargar()
  }, [])

  const ordenesFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    return ordenes.filter((o) => {
      const matchEstatus = filtroEstatus === 'todos' || o.estatus === filtroEstatus
      if (!matchEstatus) return false
      if (!q) return true
      const nombreCliente = `${o.cliente_nombre} ${o.cliente_apellidos}`.toLowerCase()
      const nombreSorteo = (o.sorteos?.nombre ?? '').toLowerCase()
      const idSorteo = (o.sorteos?.id ?? '').toLowerCase()
      return nombreCliente.includes(q) || nombreSorteo.includes(q) || idSorteo.includes(q)
    })
  }, [ordenes, busqueda, filtroEstatus])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-title text-4xl text-white tracking-wide">ÓRDENES DE COMPRA</h1>
        <p className="text-brand-muted font-body text-sm mt-1">{ordenes.length} órdenes en total</p>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
          <Input
            placeholder="Buscar por cliente, sorteo o ID de sorteo..."
            className="pl-9"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['todos', 'pendiente', 'pagado', 'cancelado'].map((e) => (
            <button
              key={e}
              onClick={() => setFiltroEstatus(e)}
              className={`px-3 py-1.5 rounded-lg text-xs font-ui capitalize cursor-pointer transition-colors ${filtroEstatus === e ? 'bg-primary text-white' : 'bg-brand-card border border-brand-border text-brand-muted hover:text-white'}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
        {cargando ? (
          <div className="p-12 text-center text-brand-muted font-body">Cargando órdenes...</div>
        ) : !ordenesFiltradas.length ? (
          <div className="p-12 text-center text-brand-muted font-body">No hay órdenes que coincidan con la búsqueda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border">
                  {['Cliente', 'Teléfono', 'Sorteo', 'Números', 'Monto', 'Estatus', 'Fecha'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-brand-muted font-ui uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordenesFiltradas.map((o) => (
                  <tr key={o.id} className="border-b border-brand-border/50 last:border-0 hover:bg-brand-border/20 transition-colors">
                    <td className="px-4 py-3 font-ui text-white whitespace-nowrap">
                      {o.cliente_nombre} {o.cliente_apellidos}
                      {o.cliente_estado && <span className="text-brand-muted font-normal"> · {o.cliente_estado}</span>}
                    </td>
                    <td className="px-4 py-3 text-brand-muted whitespace-nowrap">{o.cliente_telefono}</td>
                    <td className="px-4 py-3 text-brand-muted max-w-[180px] truncate" title={o.sorteos?.nombre ?? '—'}>
                      {o.sorteos?.nombre ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-brand-muted max-w-[140px]">
                      <span className="text-xs leading-relaxed">
                        {o.numeros?.length ? o.numeros.join(', ') : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-ui whitespace-nowrap">{formatCurrency(o.monto_total)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={o.estatus as any}>{o.estatus}</Badge>
                    </td>
                    <td className="px-4 py-3 text-brand-muted whitespace-nowrap text-xs">
                      {new Date(o.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
