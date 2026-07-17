import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  const { pedidoId } = await req.json()
  if (!pedidoId) {
    return NextResponse.json({ error: 'Falta pedidoId' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient() as any

  const { data: pedido } = await supabase
    .from('pedidos')
    .select('cliente_nombre, cliente_telefono, sorteo_id, monto_total, referencia')
    .eq('id', pedidoId)
    .single()

  if (!pedido) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  const { data: sorteo } = pedido.sorteo_id
    ? await supabase.from('sorteos').select('nombre, fecha_sorteo, usuario_id').eq('id', pedido.sorteo_id).single()
    : { data: null }

  const { data: cuenta } = sorteo
    ? await supabase
        .from('cuentas_deposito')
        .select('banco, clabe, titular')
        .eq('usuario_id', sorteo.usuario_id)
        .eq('activo', true)
        .limit(1)
        .single()
    : { data: null }

  const { data: boletos } = await supabase
    .from('boletos')
    .select('numero')
    .eq('pedido_id', pedidoId)

  const numeros = (boletos ?? []).map((b: any) => b.numero).filter(Boolean)
  const fechaSorteo = sorteo?.fecha_sorteo
    ? new Date(sorteo.fecha_sorteo).toLocaleDateString('es-MX')
    : 'por confirmar'

  const lineaReferencia = pedido.referencia
    ? `\n📝 Concepto/Referencia: *${pedido.referencia}*\n_Usa esta referencia al hacer tu transferencia para que podamos identificar tu pago más rápido._\n`
    : ''

  const mensaje = `Hola ${pedido.cliente_nombre} 👋, tu pedido en *Rifando+* fue registrado 🎉

*Sorteo:* ${sorteo?.nombre ?? 'tu sorteo'}
*Números:* ${numeros.join(', ') || 'sin números'}
*Fecha tentativa:* ${fechaSorteo}
*Total a pagar:* $${pedido.monto_total} MXN

Realiza tu transferencia en las próximas *48 horas*:
🏦 Banco: ${cuenta?.banco ?? 'Ver en plataforma'}
💳 CLABE: ${cuenta?.clabe ?? 'Ver en plataforma'}
👤 Titular: ${cuenta?.titular ?? 'Ver en plataforma'}
${lineaReferencia}
⚠️ Sin pago en 48 hrs los números se liberan automáticamente.
¡Mucha suerte! 🍀 — Rifando+`.trim()

  const result = await sendWhatsAppMessage(pedido.cliente_telefono, mensaje)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
