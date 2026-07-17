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
    .select('cliente_nombre, cliente_telefono, sorteo_id, referencia')
    .eq('id', pedidoId)
    .single()

  if (!pedido) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  const { data: sorteo } = pedido.sorteo_id
    ? await supabase.from('sorteos').select('nombre').eq('id', pedido.sorteo_id).single()
    : { data: null }

  const { data: boletos } = await supabase
    .from('boletos')
    .select('numero')
    .eq('pedido_id', pedidoId)

  const numeros = (boletos ?? []).map((b: any) => b.numero).filter(Boolean).join(', ')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rifandomas.com.mx'

  const mensaje = `Hola ${pedido.cliente_nombre} 🎉, ¡hemos confirmado tu pago! ✅

*Sorteo:* ${sorteo?.nombre ?? 'tu sorteo'}
*Números:* ${numeros || 'sin números'}
*Folio:* ${pedido.referencia ?? pedidoId.slice(0, 8)}

Ya puedes validar el estatus de tus números en la página del sorteo:
👉 ${siteUrl}/sorteo/${pedido.sorteo_id}

¡Mucha suerte! 🍀 — Rifando+`.trim()

  const result = await sendWhatsAppMessage(pedido.cliente_telefono, mensaje)
  if (!result.ok) {
    console.warn('[notificar-pago] Send failed:', result.error)
  }

  // Best-effort: el pago ya fue confirmado, WhatsApp no debe bloquear el flujo
  return NextResponse.json({ success: true, wa: result.ok })
}
