import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { generarReferenciaPedido } from '@/lib/utils'

const MAX_INTENTOS_REFERENCIA = 5

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sorteo_id, cliente_nombre, cliente_apellidos, cliente_telefono, cliente_estado, monto_total, numeros } = body

    if (!sorteo_id || !cliente_nombre || !cliente_telefono || !numeros?.length) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient() as any

    const { data: sorteoData, error: errSorteo } = await supabase
      .from('sorteos')
      .select('usuario_id, nombre, estatus')
      .eq('id', sorteo_id)
      .single()

    if (errSorteo || !sorteoData) {
      return NextResponse.json({ error: 'Sorteo no encontrado' }, { status: 404 })
    }

    if (sorteoData.estatus !== 'activo') {
      return NextResponse.json({ error: 'Este sorteo ya no está disponible para la venta de boletos' }, { status: 400 })
    }

    let pedido: any = null
    let errPedido: any = null

    for (let intento = 0; intento < MAX_INTENTOS_REFERENCIA; intento++) {
      const referencia = generarReferenciaPedido(sorteoData.nombre)
      const { data, error } = await supabase.from('pedidos').insert({
        sorteo_id,
        cliente_nombre,
        cliente_apellidos,
        cliente_telefono,
        cliente_estado,
        monto_total,
        referencia,
      }).select().single()

      if (!error) { pedido = data; break }

      if (error.code === '23505' && error.message?.includes('referencia')) {
        errPedido = error
        continue
      }
      errPedido = error
      break
    }

    if (!pedido) {
      console.error('[POST /api/pedidos] insert pedido:', errPedido)
      return NextResponse.json({ error: errPedido?.message ?? 'No se pudo crear el pedido' }, { status: 500 })
    }

    const { error: errReserva } = await supabase.rpc('reservar_boletos', {
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
      .eq('usuario_id', sorteoData.usuario_id)
      .eq('activo', true)
      .limit(1)
      .single()

    return NextResponse.json({ pedidoId: pedido.id, referencia: pedido.referencia, cuenta: cuenta ?? null })
  } catch (err) {
    console.error('[POST /api/pedidos] unexpected:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
