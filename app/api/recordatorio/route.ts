import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { telefono, nombre, sorteoNombre, numeros, monto, pedidoId } = await req.json()

    const mensaje = `
Hola ${nombre} 👋, te recordamos que tienes un pedido *pendiente de pago* en Rifando+.

*Sorteo:* ${sorteoNombre}
*Números:* ${numeros}
*Monto:* $${monto} MXN
*Folio:* ${pedidoId?.slice(0, 8)}

⚠️ Si no realizas el pago tu reserva puede ser liberada.

¿Ya pagaste? Responde este mensaje para confirmar. ¡Gracias! 🍀
— Rifando+
    `.trim()

    const apiKey = process.env.CALLMEBOT_API_KEY
    const url = `https://api.callmebot.com/whatsapp.php?phone=52${telefono}&text=${encodeURIComponent(mensaje)}&apikey=${apiKey}`

    await fetch(url, { signal: AbortSignal.timeout(10000) })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
