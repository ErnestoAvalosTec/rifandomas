'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { MultiSelectFilter } from '@/components/ui/multi-select-filter'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import { Download, Clock, MoreHorizontal, CheckCircle2, XCircle, MessageCircle, User, Search, MapPin, Phone, Ticket, Hash, Tag } from 'lucide-react'
import { formatDistanceToNow, parseISO, differenceInHours } from 'date-fns'
import { es } from 'date-fns/locale'

interface Pedido {
  id: string
  referencia: string | null
  cliente_nombre: string
  cliente_apellidos: string
  cliente_telefono: string
  cliente_estado: string | null
  monto_total: number
  estatus: string
  created_at: string
  expires_at: string
  sorteo_id: string | null
  sorteos: { nombre: string } | null
  pedido_boletos: { boletos: { numero: string } | null }[]
}

interface OrdenesTableProps {
  sorteos: { id: string; nombre: string }[]
  pedidosIniciales: Pedido[]
}

const ESTATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'cancelado', label: 'Cancelado' },
]

export function OrdenesTable({ sorteos, pedidosIniciales }: OrdenesTableProps) {
  const supabase = createClient()
  const sb = supabase as any
  const sorteoIds = sorteos.map((s) => s.id)

  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciales)
  const [filtrosEstatus, setFiltrosEstatus] = useState<string[]>([])
  const [filtrosSorteo, setFiltrosSorteo] = useState<string[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [clienteModal, setClienteModal] = useState<Pedido | null>(null)

  useEffect(() => {
    if (!sorteoIds.length) return
    const channel = sb
      .channel('mis-ordenes-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos', filter: `sorteo_id=in.(${sorteoIds.join(',')})` },
        async (payload: any) => {
          const { data: pedidoData } = await sb.from('pedidos').select('*, sorteos(nombre)').eq('id', payload.new.id).single()
          const { data: boletosData } = await sb.from('boletos').select('numero').eq('pedido_id', payload.new.id)
          if (pedidoData) {
            const pedido = {
              ...pedidoData,
              pedido_boletos: (boletosData ?? []).map((b: any) => ({ boletos: { numero: b.numero } })),
            } as Pedido
            setPedidos((prev) => [pedido, ...prev])
            toast.success(`¡Nuevo pedido de ${payload.new.cliente_nombre}!`, { duration: 5000 })
          }
        }
      )
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [sorteoIds.join(',')])

  const cambiarEstatus = async (id: string, estatus: 'pagado' | 'cancelado') => {
    const { error } = await sb.from('pedidos').update({ estatus }).eq('id', id)
    if (error) { toast.error('Error al actualizar el pedido'); return }

    // Sincronizar boletos: el verificador público lee boletos.estatus, no pedidos.estatus
    if (estatus === 'pagado') {
      await sb.from('boletos').update({ estatus: 'pagado' }).eq('pedido_id', id)
    } else {
      // Cancelado: liberar los números para que otros puedan comprarlos
      await sb.from('boletos')
        .update({ estatus: 'disponible', pedido_id: null })
        .eq('pedido_id', id)
    }

    setPedidos((prev) => prev.map((p) => p.id === id ? { ...p, estatus } : p))
    toast.success(estatus === 'pagado' ? 'Pedido marcado como pagado' : 'Pedido cancelado')
  }

  const enviarRecordatorio = async (p: Pedido) => {
    const numeros = p.pedido_boletos.map((pb) => pb.boletos?.numero).filter(Boolean).join(', ')
    const res = await fetch('/api/recordatorio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telefono: p.cliente_telefono,
        nombre: p.cliente_nombre,
        sorteoNombre: p.sorteos?.nombre ?? 'sorteo',
        numeros: numeros || 'sin números',
        monto: p.monto_total,
        pedidoId: p.id,
      }),
    })
    if (res.ok) toast.success('Recordatorio enviado por WhatsApp')
    else toast.error('No se pudo enviar el recordatorio')
  }

  const exportarCSV = () => {
    const headers = ['Folio', 'Cliente', 'Teléfono', 'Estado', 'Sorteo', 'Números', 'Monto', 'Estatus', 'Fecha']
    const filas = pedidosFiltrados.map((p) => [
      p.id.slice(0, 8),
      `${p.cliente_nombre} ${p.cliente_apellidos}`,
      p.cliente_telefono,
      p.cliente_estado ?? '',
      p.sorteos?.nombre ?? '',
      p.pedido_boletos.map((pb) => pb.boletos?.numero).filter(Boolean).join('; '),
      p.monto_total,
      p.estatus,
      new Date(p.created_at).toLocaleDateString('es-MX'),
    ])
    const csv = [headers, ...filas].map((f) => f.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `ordenes-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const pedidosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return pedidos.filter((p) => {
      const matchEstatus = filtrosEstatus.length === 0 || filtrosEstatus.includes(p.estatus)
      const matchSorteo = filtrosSorteo.length === 0 || (!!p.sorteo_id && filtrosSorteo.includes(p.sorteo_id))
      if (!matchEstatus || !matchSorteo) return false
      if (!q) return true
      const nombreCliente = `${p.cliente_nombre} ${p.cliente_apellidos}`.toLowerCase()
      const nombreSorteo = (p.sorteos?.nombre ?? '').toLowerCase()
      return (
        nombreCliente.includes(q) ||
        nombreSorteo.includes(q) ||
        p.cliente_telefono.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.referencia ?? '').toLowerCase().includes(q)
      )
    })
  }, [pedidos, filtrosEstatus, filtrosSorteo, busqueda])

  const isExpirando = (p: Pedido) => p.estatus === 'pendiente' && differenceInHours(parseISO(p.expires_at), new Date()) < 6

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <MultiSelectFilter
            options={ESTATUS_OPTIONS}
            selected={filtrosEstatus}
            onChange={setFiltrosEstatus}
            allLabel="Todos los estatus"
          />
          {sorteos.length > 1 && (
            <MultiSelectFilter
              options={sorteos.map((s) => ({ value: s.id, label: s.nombre }))}
              selected={filtrosSorteo}
              onChange={setFiltrosSorteo}
              allLabel="Todos los sorteos"
            />
          )}
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
            <Input
              placeholder="Buscar por cliente, sorteo, teléfono, folio o referencia..."
              className="pl-9"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportarCSV} className="gap-1.5 flex-shrink-0">
            <Download className="w-3.5 h-3.5" />Exportar CSV
          </Button>
        </div>
      </div>

      {!pedidosFiltrados.length ? (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-12 text-center">
          <p className="text-brand-muted font-body text-sm">
            {filtrosEstatus.length || filtrosSorteo.length || busqueda
              ? 'No hay órdenes que coincidan con los filtros.'
              : 'No hay órdenes aún.'}
          </p>
        </div>
      ) : (
        <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
          {/* ── Tarjetas móvil ── */}
          <div className="sm:hidden divide-y divide-brand-border">
            {pedidosFiltrados.map((p) => {
              const numeros = p.pedido_boletos.map((pb) => pb.boletos?.numero).filter(Boolean)
              return (
                <div key={p.id} className={`p-4 space-y-2 ${isExpirando(p) ? 'bg-red-500/5' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => setClienteModal(p)} className="font-ui font-semibold text-white text-sm text-left hover:text-primary transition-colors flex items-center gap-1.5 min-w-0">
                      <User className="w-3.5 h-3.5 text-brand-muted flex-shrink-0" />
                      <span className="truncate">{p.cliente_nombre} {p.cliente_apellidos}</span>
                    </button>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge variant={p.estatus as any}>{p.estatus}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="w-7 h-7">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {p.estatus !== 'pagado' && (
                            <DropdownMenuItem onClick={() => cambiarEstatus(p.id, 'pagado')}>
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />Marcar como pagado
                            </DropdownMenuItem>
                          )}
                          {p.estatus !== 'cancelado' && (
                            <DropdownMenuItem onClick={() => cambiarEstatus(p.id, 'cancelado')}>
                              <XCircle className="w-3.5 h-3.5 text-red-400" />Cancelar pedido
                            </DropdownMenuItem>
                          )}
                          {p.estatus === 'pendiente' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => enviarRecordatorio(p)}>
                                <MessageCircle className="w-3.5 h-3.5 text-primary" />Enviar recordatorio
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-brand-muted truncate">{p.sorteos?.nombre ?? '—'}</p>
                    {p.referencia && (
                      <span className="text-brand-gold font-ui font-semibold text-xs tracking-widest flex-shrink-0">{p.referencia}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-ui font-semibold text-white text-sm">{formatCurrency(p.monto_total)}</span>
                    {p.estatus === 'pendiente' && (
                      <span className={`flex items-center gap-1 text-xs font-ui ${isExpirando(p) ? 'text-red-400' : 'text-brand-muted'}`}>
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(parseISO(p.expires_at), { locale: es, addSuffix: true })}
                      </span>
                    )}
                  </div>
                  {numeros.length > 0 && (
                    <p className="text-xs text-brand-muted">
                      <span className="text-brand-text font-ui">Núms:</span> {numeros.join(', ')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Tabla desktop ── */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border">
                  {['Folio', 'Referencia', 'Cliente', 'Teléfono', 'Sorteo', 'Números', 'Monto', 'Estatus', 'Expira', 'Acciones'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-brand-muted font-ui uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map((p) => {
                  const numeros = p.pedido_boletos.map((pb) => pb.boletos?.numero).filter(Boolean)
                  return (
                    <tr key={p.id} className={`border-b border-brand-border/50 last:border-0 transition-colors ${isExpirando(p) ? 'bg-red-500/5' : 'hover:bg-brand-border/20'}`}>
                      <td className="px-4 py-3 text-brand-muted font-ui text-xs">{p.id.slice(0, 8)}…</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.referencia ? (
                          <span className="text-brand-gold font-ui font-semibold text-xs tracking-widest">{p.referencia}</span>
                        ) : (
                          <span className="text-brand-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button onClick={() => setClienteModal(p)} className="font-ui text-white hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer">
                          <User className="w-3 h-3 text-brand-muted" />
                          {p.cliente_nombre} {p.cliente_apellidos}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-brand-muted">{p.cliente_telefono}</td>
                      <td className="px-4 py-3 text-brand-muted whitespace-nowrap">{p.sorteos?.nombre ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-brand-gold text-xs font-ui">
                          {numeros.length ? numeros.join(', ') : <span className="text-brand-muted">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-semibold whitespace-nowrap">{formatCurrency(p.monto_total)}</td>
                      <td className="px-4 py-3"><Badge variant={p.estatus as any}>{p.estatus}</Badge></td>
                      <td className="px-4 py-3">
                        {p.estatus === 'pendiente' ? (
                          <span className={`flex items-center gap-1 text-xs font-ui whitespace-nowrap ${isExpirando(p) ? 'text-red-400' : 'text-brand-muted'}`}>
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(parseISO(p.expires_at), { locale: es, addSuffix: true })}
                          </span>
                        ) : <span className="text-brand-muted text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="w-7 h-7">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {p.estatus !== 'pagado' && (
                              <DropdownMenuItem onClick={() => cambiarEstatus(p.id, 'pagado')}>
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />Marcar como pagado
                              </DropdownMenuItem>
                            )}
                            {p.estatus !== 'cancelado' && (
                              <DropdownMenuItem onClick={() => cambiarEstatus(p.id, 'cancelado')}>
                                <XCircle className="w-3.5 h-3.5 text-red-400" />Cancelar pedido
                              </DropdownMenuItem>
                            )}
                            {p.estatus === 'pendiente' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => enviarRecordatorio(p)}>
                                  <MessageCircle className="w-3.5 h-3.5 text-primary" />Enviar recordatorio
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal datos del cliente */}
      <Dialog open={!!clienteModal} onOpenChange={(open) => { if (!open) setClienteModal(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-title text-2xl">DATOS DEL CLIENTE</DialogTitle>
          </DialogHeader>
          {clienteModal && (
            <div className="space-y-4 pt-2">
              {/* Encabezado: nombre + estatus */}
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-brand-border">
                <div className="min-w-0">
                  <p className="font-ui font-semibold text-white text-lg leading-snug truncate">
                    {clienteModal.cliente_nombre} {clienteModal.cliente_apellidos}
                  </p>
                  {clienteModal.cliente_estado && (
                    <p className="flex items-center gap-1 text-xs text-brand-muted mt-1">
                      <MapPin className="w-3 h-3" />
                      {clienteModal.cliente_estado}
                    </p>
                  )}
                </div>
                <Badge variant={clienteModal.estatus as any} className="flex-shrink-0">{clienteModal.estatus}</Badge>
              </div>

              {/* Info principal */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="space-y-1">
                  <p className="flex items-center gap-1 text-[11px] text-brand-muted font-ui uppercase tracking-wide">
                    <Phone className="w-3 h-3" />Teléfono
                  </p>
                  <a href={`https://wa.me/52${clienteModal.cliente_telefono}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-ui text-sm">
                    {clienteModal.cliente_telefono}
                  </a>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-brand-muted font-ui uppercase tracking-wide">Monto</p>
                  <p className="text-white font-ui font-semibold text-sm">{formatCurrency(clienteModal.monto_total)}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="flex items-center gap-1 text-[11px] text-brand-muted font-ui uppercase tracking-wide">
                    <Ticket className="w-3 h-3" />Sorteo
                  </p>
                  <p className="text-white font-ui text-sm truncate">{clienteModal.sorteos?.nombre ?? '—'}</p>
                </div>
              </div>

              {/* Números seleccionados */}
              <div className="space-y-1.5">
                <p className="text-[11px] text-brand-muted font-ui uppercase tracking-wide">Números seleccionados</p>
                {(() => {
                  const numeros = clienteModal.pedido_boletos.map((pb) => pb.boletos?.numero).filter(Boolean) as string[]
                  return numeros.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {numeros.map((n) => (
                        <span key={n} className="px-2.5 py-1 rounded-md bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-ui font-semibold">
                          {n}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-brand-muted font-ui text-sm">—</p>
                  )
                })()}
              </div>

              {/* Referencia de transferencia */}
              {clienteModal.referencia && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <p className="flex items-center gap-1 text-[11px] text-brand-muted font-ui uppercase tracking-wide">
                    <Tag className="w-3 h-3" />Referencia
                  </p>
                  <p className="text-brand-gold font-ui font-semibold text-sm tracking-widest">{clienteModal.referencia}</p>
                </div>
              )}

              {/* Folio */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <p className="flex items-center gap-1 text-[11px] text-brand-muted font-ui uppercase tracking-wide">
                  <Hash className="w-3 h-3" />Folio
                </p>
                <p className="text-brand-muted font-ui text-[11px] truncate">{clienteModal.id}</p>
              </div>

              <a
                href={`https://wa.me/52${clienteModal.cliente_telefono}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block pt-1"
              >
                <Button className="w-full gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Abrir WhatsApp
                </Button>
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
