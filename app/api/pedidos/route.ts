import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sorteo_id, usuario_id, cliente_nombre, cliente_apellidos, cliente_telefono, cliente_estado, monto_total, numeros } = body

    if (!sorteo_id || !cliente_nombre || !cliente_telefono || !numeros?.length) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    const { data: pedido, error: errPedido } = await supabase.from('pedidos').insert({
      sorteo_id,
      cliente_nombre,
      cliente_apellidos,
      cliente_telefono,
      cliente_estado,
      monto_total,
    }).select().single()

    if (errPedido || !pedido) {
      console.error('[POST /api/pedidos] insert pedido:', errPedido)
      return NextResponse.json({ error: errPedido?.message ?? 'No se pudo crear el pedido' }, { status: 500 })
    }

    const { error: errReserva } = await (supabase as any).rpc('reservar_boletos', {
      p_numeros: numeros,
      p_sorteo_id: sorteo_id,
      p_pedido_id: pedido.id,
    })

    if (errReserva) {
      console.error('[POST /api/pedidos] reservar_boletos:', errReserva)
      if (errReserva.message?.includes('uno_o_mas_numeros_no_disponibles')) {
        await supabase.from('pedidos').update({ estatus: 'cancelado' }).eq('id', pedido.id)
        return NextResponse.json({ error: 'numeros_no_disponibles' }, { status: 409 })
      }
      return NextResponse.json({ error: errReserva.message }, { status: 500 })
    }

    const { data: cuenta } = await supabase
      .from('cuentas_deposito')
      .select('banco, clabe, titular')
      .eq('usuario_id', usuario_id)
      .eq('activo', true)
      .limit(1)
      .single()

    return NextResponse.json({ pedidoId: pedido.id, cuenta: cuenta ?? null })
  } catch (err) {
    console.error('[POST /api/pedidos] unexpected:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
