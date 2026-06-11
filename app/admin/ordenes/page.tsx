'use client'

import { useEffect, useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { MultiSelectFilter } from '@/components/ui/multi-select-filter'
import { formatCurrency } from '@/lib/utils'
import { Search } from 'lucide-react'

const ESTATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'cancelado', label: 'Cancelado' },
]

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
  const [filtrosEstatus, setFiltrosEstatus] = useState<string[]>([])
  const [filtrosSorteo, setFiltrosSorteo] = useState<string[]>([])
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

  const sorteoOptions = useMemo(() => {
    const map = new Map<string, string>()
    ordenes.forEach((o) => { if (o.sorteos) map.set(o.sorteos.id, o.sorteos.nombre) })
    return Array.from(map, ([value, label]) => ({ value, label }))
  }, [ordenes])

  const ordenesFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    return ordenes.filter((o) => {
      const matchEstatus = filtrosEstatus.length === 0 || filtrosEstatus.includes(o.estatus)
      const matchSorteo = filtrosSorteo.length === 0 || (!!o.sorteos && filtrosSorteo.includes(o.sorteos.id))
      if (!matchEstatus || !matchSorteo) return false
      if (!q) return true
      const nombreCliente = `${o.cliente_nombre} ${o.cliente_apellidos}`.toLowerCase()
      const nombreSorteo = (o.sorteos?.nombre ?? '').toLowerCase()
      return (
        nombreCliente.includes(q) ||
        nombreSorteo.includes(q) ||
        o.cliente_telefono.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
      )
    })
  }, [ordenes, busqueda, filtrosEstatus, filtrosSorteo])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-title text-4xl text-white tracking-wide">ÓRDENES DE COMPRA</h1>
        <p className="text-brand-muted font-body text-sm mt-1">{ordenes.length} órdenes en total</p>
      </div>

      <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 flex-wrap">
          <MultiSelectFilter
            options={ESTATUS_OPTIONS}
            selected={filtrosEstatus}
            onChange={setFiltrosEstatus}
            allLabel="Todos los estatus"
          />
          {sorteoOptions.length > 1 && (
            <MultiSelectFilter
              options={sorteoOptions}
              selected={filtrosSorteo}
              onChange={setFiltrosSorteo}
              allLabel="Todos los sorteos"
            />
          )}
        </div>
        <div className="relative flex-1 lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
          <Input
            placeholder="Buscar por cliente, sorteo, teléfono o folio..."
            className="pl-9"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
        {cargando ? (
          <div className="p-12 text-center text-brand-muted font-body">Cargando órdenes...</div>
        ) : !ordenesFiltradas.length ? (
          <div className="p-12 text-center text-brand-muted font-body">No hay órdenes que coincidan con la búsqueda.</div>
        ) : (
          <>
            {/* ── Tarjetas móvil ── */}
            <div className="sm:hidden divide-y divide-brand-border">
              {ordenesFiltradas.map((o) => (
                <div key={o.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-ui font-semibold text-white text-sm truncate">
                        {o.cliente_nombre} {o.cliente_apellidos}
                      </p>
                      {o.cliente_estado && <p className="text-xs text-brand-muted">{o.cliente_estado}</p>}
                    </div>
                    <Badge variant={o.estatus as any}>{o.estatus}</Badge>
                  </div>
                  <p className="text-xs text-brand-muted truncate">{o.sorteos?.nombre ?? '—'}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-brand-muted">{o.cliente_telefono}</span>
                    <span className="font-ui font-semibold text-white text-sm">{formatCurrency(o.monto_total)}</span>
                  </div>
                  {o.numeros?.length > 0 && (
                    <p className="text-xs text-brand-muted">
                      <span className="text-brand-text font-ui">Núms:</span> {o.numeros.join(', ')}
                    </p>
                  )}
                  <p className="text-xs text-brand-muted">
                    {new Date(o.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>

            {/* ── Tabla desktop ── */}
            <div className="hidden sm:block overflow-x-auto">
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
                      <td className="px-4 py-3"><Badge variant={o.estatus as any}>{o.estatus}</Badge></td>
                      <td className="px-4 py-3 text-brand-muted whitespace-nowrap text-xs">
                        {new Date(o.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
