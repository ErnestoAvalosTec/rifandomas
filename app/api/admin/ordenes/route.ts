import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const supabase = createAdminSupabaseClient()

    const { data: pedidos, error } = await (supabase as any)
      .from('pedidos')
      .select('*, sorteos(id, nombre)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[GET /api/admin/ordenes] pedidos:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!pedidos?.length) return NextResponse.json([])

    const pedidoIds: string[] = pedidos.map((p: any) => p.id)

    // Obtener boletos vía pedido_boletos (junction table) con fallback a FK directa
    const { data: pedidoBoletos } = await (supabase as any)
      .from('pedido_boletos')
      .select('pedido_id, boletos(numero)')
      .in('pedido_id', pedidoIds)

    // Agrupar números por pedido_id
    const numerosPorPedido: Record<string, string[]> = {}
    if (pedidoBoletos?.length) {
      for (const pb of pedidoBoletos) {
        if (!numerosPorPedido[pb.pedido_id]) numerosPorPedido[pb.pedido_id] = []
        if (pb.boletos?.numero) numerosPorPedido[pb.pedido_id].push(pb.boletos.numero)
      }
    } else {
      // Fallback: boletos con pedido_id directo
      const { data: boletosDirectos } = await (supabase as any)
        .from('boletos')
        .select('pedido_id, numero')
        .in('pedido_id', pedidoIds)

      for (const b of boletosDirectos ?? []) {
        if (!numerosPorPedido[b.pedido_id]) numerosPorPedido[b.pedido_id] = []
        numerosPorPedido[b.pedido_id].push(b.numero)
      }
    }

    const resultado = pedidos.map((p: any) => ({
      ...p,
      numeros: numerosPorPedido[p.id] ?? [],
    }))

    return NextResponse.json(resultado)
  } catch (err) {
    console.error('[GET /api/admin/ordenes] unexpected:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
