import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { ReportesSorteosList, type SorteoReporte } from '@/components/shared/ReportesSorteosList'
import type { PedidoArchivado } from '@/components/shared/PedidosSoloLectura'

export default async function AdminReportesPage() {
  const admin = createAdminSupabaseClient() as any

  const { data: sorteosData } = await admin
    .from('sorteos')
    .select('id, nombre, estatus, fecha_sorteo, perfiles(nombre, apellidos)')
    .in('estatus', ['finalizado', 'pausado'])
    .order('fecha_sorteo', { ascending: false })

  const sorteos = sorteosData ?? []
  const sorteoIds = sorteos.map((s: any) => s.id)

  const { data: pedidosData } = sorteoIds.length
    ? await admin
        .from('pedidos')
        .select('id, sorteo_id, cliente_nombre, cliente_apellidos, cliente_telefono, monto_total, estatus, created_at, referencia')
        .in('sorteo_id', sorteoIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const pedidos = pedidosData ?? []
  const pedidoIds = pedidos.map((p: any) => p.id)

  // Boletos vía pedido_boletos con fallback a boletos.pedido_id — mismo
  // patrón que app/api/admin/ordenes/route.ts para datos legacy.
  const { data: pedidoBoletos } = pedidoIds.length
    ? await admin.from('pedido_boletos').select('pedido_id, boletos(numero)').in('pedido_id', pedidoIds)
    : { data: [] }

  const numerosPorPedido = new Map<string, string[]>()
  if (pedidoBoletos?.length) {
    for (const pb of pedidoBoletos) {
      if (!numerosPorPedido.has(pb.pedido_id)) numerosPorPedido.set(pb.pedido_id, [])
      if (pb.boletos?.numero) numerosPorPedido.get(pb.pedido_id)!.push(pb.boletos.numero)
    }
  } else if (pedidoIds.length) {
    const { data: boletosDirectos } = await admin.from('boletos').select('pedido_id, numero').in('pedido_id', pedidoIds)
    for (const b of boletosDirectos ?? []) {
      if (!numerosPorPedido.has(b.pedido_id)) numerosPorPedido.set(b.pedido_id, [])
      numerosPorPedido.get(b.pedido_id)!.push(b.numero)
    }
  }

  const sorteosConTotales: SorteoReporte[] = sorteos.map((s: any) => {
    const pedidosDelSorteo: PedidoArchivado[] = pedidos
      .filter((p: any) => p.sorteo_id === s.id)
      .map((p: any) => ({ ...p, numeros: numerosPorPedido.get(p.id) ?? [] }))
    return {
      id: s.id,
      nombre: s.nombre,
      estatus: s.estatus,
      fecha_sorteo: s.fecha_sorteo,
      organizador: s.perfiles ? `${s.perfiles.nombre} ${s.perfiles.apellidos}` : undefined,
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
        <h1 className="font-title text-4xl text-brand-text tracking-wide">REPORTES</h1>
        <p className="text-brand-muted font-body text-sm">Pedidos e ingresos de todos los sorteos finalizados y pausados.</p>
      </div>
      <ReportesSorteosList sorteos={sorteosConTotales} />
    </div>
  )
}
