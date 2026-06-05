'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { CheckCircle2, Download, Clock } from 'lucide-react'
import { formatDistanceToNow, parseISO, differenceInHours } from 'date-fns'
import { es } from 'date-fns/locale'

interface Pedido {
  id: string
  cliente_nombre: string
  cliente_apellidos: string
  cliente_telefono: string
  monto_total: number
  estatus: string
  created_at: string
  expires_at: string
  sorteos: { nombre: string } | null
  pedido_boletos: { boletos: { numero: string } | null }[]
}

interface OrdenesTableProps {
  sorteoIds: string[]
  pedidosIniciales: Pedido[]
}

export function OrdenesTable({ sorteoIds, pedidosIniciales }: OrdenesTableProps) {
  const supabase = createClient()
  const sb = supabase as any
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciales)
  const [filtro, setFiltro] = useState<string>('todos')

  useEffect(() => {
    if (!sorteoIds.length) return
    const channel = sb
      .channel('mis-ordenes-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos', filter: `sorteo_id=in.(${sorteoIds.join(',')})` },
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
  }, [sorteoIds])

  const marcarPagado = async (id: string) => {
    const { error } = await sb.from('pedidos').update({ estatus: 'pagado' }).eq('id', id)
    if (!error) {
      setPedidos((prev) => prev.map((p) => p.id === id ? { ...p, estatus: 'pagado' } : p))
      toast.success('Pedido marcado como pagado')
    } else {
      toast.error('Error al actualizar')
    }
  }

  const exportarCSV = () => {
    const headers = ['Folio', 'Cliente', 'Teléfono', 'Sorteo', 'Números', 'Monto', 'Estatus', 'Fecha']
    const filas = pedidosFiltrados.map((p) => [
      p.id.slice(0, 8),
      `${p.cliente_nombre} ${p.cliente_apellidos}`,
      p.cliente_telefono,
      p.sorteos?.nombre ?? '',
      p.pedido_boletos.map((pb) => pb.boletos?.numero).join('; '),
      p.monto_total,
      p.estatus,
      new Date(p.created_at).toLocaleDateString('es-MX'),
    ])
    const csv = [headers, ...filas].map((f) => f.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ordenes-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const pedidosFiltrados = filtro === 'todos' ? pedidos : pedidos.filter((p) => p.estatus === filtro)
  const isExpirando = (p: Pedido) => p.estatus === 'pendiente' && differenceInHours(parseISO(p.expires_at), new Date()) < 6

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {['todos', 'pendiente', 'pagado', 'cancelado'].map((f) => (
            <button key={f} onClick={() => setFiltro(f)} className={`px-3 py-1.5 rounded-lg text-xs font-ui capitalize transition-colors cursor-pointer ${filtro === f ? 'bg-primary text-white' : 'bg-brand-card border border-brand-border text-brand-muted hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={exportarCSV} className="gap-1.5">
          <Download className="w-3.5 h-3.5" />Exportar CSV
        </Button>
      </div>

      {!pedidosFiltrados.length ? (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-12 text-center">
          <p className="text-brand-muted font-body text-sm">No hay órdenes {filtro !== 'todos' ? `con estatus "${filtro}"` : 'aún'}.</p>
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
                {pedidosFiltrados.map((p) => (
                  <tr key={p.id} className={`border-b border-brand-border/50 last:border-0 transition-colors ${isExpirando(p) ? 'bg-red-500/5' : 'hover:bg-brand-border/20'}`}>
                    <td className="px-4 py-3 text-brand-muted font-ui text-xs">{p.id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 font-ui text-white whitespace-nowrap">{p.cliente_nombre} {p.cliente_apellidos}</td>
                    <td className="px-4 py-3 text-brand-muted">{p.cliente_telefono}</td>
                    <td className="px-4 py-3 text-brand-muted whitespace-nowrap">{p.sorteos?.nombre ?? '—'}</td>
                    <td className="px-4 py-3"><span className="text-brand-gold text-xs font-ui">{p.pedido_boletos.map((pb) => pb.boletos?.numero).join(', ')}</span></td>
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
                      {p.estatus === 'pendiente' && (
                        <Button size="sm" variant="outline" onClick={() => marcarPagado(p.id)} className="gap-1.5 h-7 text-xs whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3" />Pagado
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
