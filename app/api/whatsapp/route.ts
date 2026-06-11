import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function POST(request: Request) {
  const body = await request.json() as {
    telefono: string
    nombre: string
    sorteoNombre: string
    numeros: string[]
    fechaSorteo: string
    montoTotal: number
    banco: string
    clabe: string
    titular: string
    pedidoId: string
    referencia?: string | null
  }

  const { telefono, nombre, sorteoNombre, numeros, fechaSorteo, montoTotal, banco, clabe, titular, pedidoId, referencia } = body

  const lineaReferencia = referencia
    ? `\n📝 Concepto/Referencia: *${referencia}*\n_Usa esta referencia al hacer tu transferencia para que podamos identificar tu pago más rápido._\n`
    : ''

  const mensaje = `Hola ${nombre} 👋, tu pedido en *Rifando+* fue registrado 🎉

*Sorteo:* ${sorteoNombre}
*Números:* ${numeros.join(', ')}
*Fecha tentativa:* ${fechaSorteo}
*Total a pagar:* $${montoTotal} MXN

Realiza tu transferencia en las próximas *48 horas*:
🏦 Banco: ${banco}
💳 CLABE: ${clabe}
👤 Titular: ${titular}
${lineaReferencia}
⚠️ Sin pago en 48 hrs los números se liberan automáticamente.
¡Mucha suerte! 🍀 — Rifando+`.trim()

  try {
    const result = await sendWhatsAppMessage(telefono, mensaje)

    if (result.ok) {
      const supabase = createAdminSupabaseClient()
      await (supabase as any).from('pedidos').update({ whatsapp_enviado: true }).eq('id', pedidoId)
      return Response.json({ success: true })
    }

    console.warn('[whatsapp/cliente] Send failed:', result.error)
  } catch (err) {
    console.error('[whatsapp/cliente] Unexpected error:', err)
  }

  // WhatsApp es best-effort — el pedido ya fue creado exitosamente
  return Response.json({ success: false, message: 'WhatsApp no disponible' }, { status: 500 })
}
