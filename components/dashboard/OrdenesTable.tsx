'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/utils'
import { Download, Clock, MoreHorizontal, CheckCircle2, XCircle, MessageCircle, User } from 'lucide-react'
import { formatDistanceToNow, parseISO, differenceInHours } from 'date-fns'
import { es } from 'date-fns/locale'

interface Pedido {
  id: string
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

export function OrdenesTable({ sorteos, pedidosIniciales }: OrdenesTableProps) {
  const supabase = createClient()
  const sb = supabase as any
  const sorteoIds = sorteos.map((s) => s.id)

  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciales)
  const [filtroEstatus, setFiltroEstatus] = useState<string>('todos')
  const [filtroSorteo, setFiltroSorteo] = useState<string>('todos')
  const [clienteModal, setClienteModal] = useState<Pedido | null>(null)

  useEffect(() => {
    if (!sorteoIds.length) return
    const channel = sb
      .channel('mis-ordenes-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos', filter: `sorteo_id=in.(${sorteoIds.join(',')})` },
        async (payload: any) => {
          const { data } = await sb.from('pedidos').select('*, sorteos(nombre), pedido_boletos(boletos(numero))').eq('id', payload.new.id).single()
          if (data) {
            setPedidos((prev) => [data as Pedido, ...prev])
            toast.success(`¡Nuevo pedido de ${payload.new.cliente_nombre}!`, { duration: 5000 })
          }
        }
      )
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [sorteoIds.join(',')])

  const cambiarEstatus = async (id: string, estatus: 'pagado' | 'cancelado') => {
    const { error } = await sb.from('pedidos').update({ estatus }).eq('id', id)
    if (!error) {
      setPedidos((prev) => prev.map((p) => p.id === id ? { ...p, estatus } : p))
      toast.success(estatus === 'pagado' ? 'Pedido marcado como pagado' : 'Pedido cancelado')
    } else {
      toast.error('Error al actualizar el pedido')
    }
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
    return pedidos.filter((p) => {
      const matchEstatus = filtroEstatus === 'todos' || p.estatus === filtroEstatus
      const matchSorteo = filtroSorteo === 'todos' || p.sorteo_id === filtroSorteo
      return matchEstatus && matchSorteo
    })
  }, [pedidos, filtroEstatus, filtroSorteo])

  const isExpirando = (p: Pedido) => p.estatus === 'pendiente' && differenceInHours(parseISO(p.expires_at), new Date()) < 6

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1.5 flex-wrap">
            {['todos', 'pendiente', 'pagado', 'cancelado'].map((f) => (
              <button key={f} onClick={() => setFiltroEstatus(f)} className={`px-3 py-1.5 rounded-lg text-xs font-ui capitalize transition-colors cursor-pointer ${filtroEstatus === f ? 'bg-primary text-white' : 'bg-brand-card border border-brand-border text-brand-muted hover:text-white'}`}>
                {f}
              </button>
            ))}
          </div>
          {sorteos.length > 1 && (
            <div className="flex gap-1.5 flex-wrap border-l border-brand-border pl-3 ml-1">
              <button onClick={() => setFiltroSorteo('todos')} className={`px-3 py-1.5 rounded-lg text-xs font-ui transition-colors cursor-pointer ${filtroSorteo === 'todos' ? 'bg-primary text-white' : 'bg-brand-card border border-brand-border text-brand-muted hover:text-white'}`}>
                Todos los sorteos
              </button>
              {sorteos.map((s) => (
                <button key={s.id} onClick={() => setFiltroSorteo(s.id)} className={`px-3 py-1.5 rounded-lg text-xs font-ui transition-colors cursor-pointer truncate max-w-[160px] ${filtroSorteo === s.id ? 'bg-primary text-white' : 'bg-brand-card border border-brand-border text-brand-muted hover:text-white'}`}>
                  {s.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={exportarCSV} className="gap-1.5">
          <Download className="w-3.5 h-3.5" />Exportar CSV
        </Button>
      </div>

      {!pedidosFiltrados.length ? (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-12 text-center">
          <p className="text-brand-muted font-body text-sm">No hay órdenes {filtroEstatus !== 'todos' ? `con estatus "${filtroEstatus}"` : 'aún'}.</p>
        </div>
      ) : (
        <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border">
                  {['Folio', 'Cliente', 'Teléfono', 'Sorteo', 'Números', 'Monto', 'Estatus', 'Expira', 'Acciones'].map((h) => (
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
                        <button
                          onClick={() => setClienteModal(p)}
                          className="font-ui text-white hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
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
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                Marcar como pagado
                              </DropdownMenuItem>
                            )}
                            {p.estatus !== 'cancelado' && (
                              <DropdownMenuItem onClick={() => cambiarEstatus(p.id, 'cancelado')}>
                                <XCircle className="w-3.5 h-3.5 text-red-400" />
                                Cancelar pedido
                              </DropdownMenuItem>
                            )}
                            {p.estatus === 'pendiente' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => enviarRecordatorio(p)}>
                                  <MessageCircle className="w-3.5 h-3.5 text-primary" />
                                  Enviar recordatorio
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-brand-muted font-ui uppercase tracking-wide">Nombre</p>
                  <p className="text-gray-900 font-ui">{clienteModal.cliente_nombre} {clienteModal.cliente_apellidos}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-brand-muted font-ui uppercase tracking-wide">Teléfono</p>
                  <a href={`https://wa.me/52${clienteModal.cliente_telefono}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-ui">
                    {clienteModal.cliente_telefono}
                  </a>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-brand-muted font-ui uppercase tracking-wide">Estado</p>
                  <p className="text-gray-900 font-ui">{clienteModal.cliente_estado ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-brand-muted font-ui uppercase tracking-wide">Sorteo</p>
                  <p className="text-gray-900 font-ui">{clienteModal.sorteos?.nombre ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-brand-muted font-ui uppercase tracking-wide">Monto</p>
                  <p className="text-brand-text font-ui font-semibold">{formatCurrency(clienteModal.monto_total)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-brand-muted font-ui uppercase tracking-wide">Estatus</p>
                  <Badge variant={clienteModal.estatus as any}>{clienteModal.estatus}</Badge>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-brand-muted font-ui uppercase tracking-wide">Números seleccionados</p>
                <p className="text-brand-gold font-ui text-sm">
                  {clienteModal.pedido_boletos.map((pb) => pb.boletos?.numero).filter(Boolean).join(', ') || '—'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-brand-muted font-ui uppercase tracking-wide">Folio</p>
                <p className="text-brand-muted font-ui text-xs">{clienteModal.id}</p>
              </div>
              <div className="pt-2">
                <a
                  href={`https://wa.me/52${clienteModal.cliente_telefono}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Abrir WhatsApp
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
