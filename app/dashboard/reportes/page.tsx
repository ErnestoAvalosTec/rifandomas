import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReportesSorteosList, type SorteoReporte } from '@/components/shared/ReportesSorteosList'
import type { PedidoArchivado } from '@/components/shared/PedidosSoloLectura'

export default async function ReportesPage() {
  const supabase = createClient()
  const sb = supabase as any
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: sorteosData } = await sb
    .from('sorteos')
    .select('id, nombre, estatus, fecha_sorteo')
    .eq('usuario_id', session.user.id)
    .in('estatus', ['finalizado', 'pausado'])
    .order('fecha_sorteo', { ascending: false })

  const sorteos = sorteosData ?? []
  const sorteoIds = sorteos.map((s: any) => s.id)

  const { data: pedidosData } = sorteoIds.length
    ? await sb
        .from('pedidos')
        .select('id, sorteo_id, cliente_nombre, cliente_apellidos, cliente_telefono, monto_total, estatus, created_at, referencia')
        .in('sorteo_id', sorteoIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const pedidos = pedidosData ?? []
  const pedidoIds = pedidos.map((p: any) => p.id)

  const { data: boletosData } = pedidoIds.length
    ? await sb.from('boletos').select('pedido_id, numero').in('pedido_id', pedidoIds)
    : { data: [] }

  const numerosPorPedido = new Map<string, string[]>()
  ;(boletosData ?? []).forEach((b: any) => {
    if (!b.pedido_id) return
    if (!numerosPorPedido.has(b.pedido_id)) numerosPorPedido.set(b.pedido_id, [])
    numerosPorPedido.get(b.pedido_id)!.push(b.numero)
  })

  const sorteosConTotales: SorteoReporte[] = sorteos.map((s: any) => {
    const pedidosDelSorteo: PedidoArchivado[] = pedidos
      .filter((p: any) => p.sorteo_id === s.id)
      .map((p: any) => ({ ...p, numeros: numerosPorPedido.get(p.id) ?? [] }))
    return {
      id: s.id,
      nombre: s.nombre,
      estatus: s.estatus,
      fecha_sorteo: s.fecha_sorteo,
      pedidosTotales: pedidosDelSorteo.length,
      ingresosPagados: pedidosDelSorteo
        .filter((p) => p.estatus === 'pagado')
        .reduce((acc, p) => acc + Number(p.monto_total), 0),
      pedidos: pedidosDelSorteo,
    }
  })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-title text-4xl text-white tracking-wide">REPORTES</h1>
        <p className="text-brand-muted font-body text-sm">Pedidos e ingresos de tus sorteos finalizados y pausados.</p>
      </div>
      <ReportesSorteosList sorteos={sorteosConTotales} />
    </div>
  )
}
