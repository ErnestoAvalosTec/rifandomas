import { createAdminSupabaseClient } from '@/lib/supabase/server'

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
  }

  const { telefono, nombre, sorteoNombre, numeros, fechaSorteo, montoTotal, banco, clabe, titular, pedidoId } = body

  const mensaje = `
Hola ${nombre} 👋, tu pedido en *Rifando+* fue registrado 🎉

*Sorteo:* ${sorteoNombre}
*Números:* ${numeros.join(', ')}
*Fecha tentativa:* ${fechaSorteo}
*Total a pagar:* $${montoTotal} MXN

Realiza tu transferencia en las próximas *48 horas*:
🏦 Banco: ${banco}
💳 CLABE: ${clabe}
👤 Titular: ${titular}

⚠️ Sin pago en 48 hrs los números se liberan automáticamente.
¡Mucha suerte! 🍀 — Rifando+
  `.trim()

  const digits = telefono.replace(/\D/g, '')
  const phoneNormalized = digits.startsWith('52') ? digits : `52${digits}`

  const apiKey = process.env.CALLMEBOT_API_KEY
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phoneNormalized}&text=${encodeURIComponent(mensaje)}&apikey=${apiKey}`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (res.ok) {
      const supabase = createAdminSupabaseClient()
      await (supabase as any).from('pedidos').update({ whatsapp_enviado: true }).eq('id', pedidoId)
      return Response.json({ success: true })
    }
  } catch {
    // WhatsApp notification is best-effort; don't fail the order
  }

  return Response.json({ success: false, message: 'WhatsApp no disponible' }, { status: 500 })
}
