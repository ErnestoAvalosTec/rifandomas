import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { telefono, nombre, sorteoNombre, numeros, monto, pedidoId } = await req.json()

    const supabase = createAdminSupabaseClient() as any
    const { data: pedido } = await supabase
      .from('pedidos')
      .select('sorteo_id, expires_at')
      .eq('id', pedidoId)
      .single()

    const { data: cuenta } = pedido
      ? await supabase
          .from('sorteos')
          .select('usuario_id, estatus')
          .eq('id', pedido.sorteo_id)
          .single()
      : { data: null }

    if (cuenta && cuenta.estatus !== 'activo') {
      return NextResponse.json({ error: 'Este pedido pertenece a un sorteo que ya no está activo' }, { status: 400 })
    }

    const { data: cuentaDeposito } = cuenta
      ? await supabase
          .from('cuentas_deposito')
          .select('banco, clabe, titular')
          .eq('usuario_id', cuenta.usuario_id)
          .eq('activo', true)
          .limit(1)
          .single()
      : { data: null }

    const bancoInfo = cuentaDeposito
      ? `\n🏦 Banco: ${cuentaDeposito.banco}\n💳 CLABE: ${cuentaDeposito.clabe}\n👤 Titular: ${cuentaDeposito.titular}`
      : ''

    const mensaje = `Hola ${nombre} 👋, te recordamos que tienes un pago *pendiente* en Rifando+.

*Sorteo:* ${sorteoNombre}
*Números:* ${numeros}
*Monto:* $${monto} MXN
*Folio:* ${pedidoId?.slice(0, 8)}${bancoInfo}

⚠️ Sin pago tu reserva puede liberarse automáticamente.
¡Gracias! 🍀 — Rifando+`.trim()

    const result = await sendWhatsAppMessage(telefono, mensaje)

    if (result.ok) return NextResponse.json({ success: true })

    console.warn('[recordatorio] Send failed:', result.error)
    return NextResponse.json({ success: false, error: result.error }, { status: 500 })
  } catch (err) {
    console.error('[recordatorio] Unexpected error:', err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
