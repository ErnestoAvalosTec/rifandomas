import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { requireAdmin } from '@/lib/supabase/guard'

function buildMessage(nombre: string, sorteoNombre: string, accion: string, motivo: string): string {
  const base = `Hola ${nombre} 👋, te informamos que tu sorteo en *RifandoPlus* ha recibido una actualización.\n\n*Sorteo:* ${sorteoNombre}`

  if (accion === 'pausado') {
    return `${base}\n*Estado:* ⏸️ pausado temporalmente\n*Motivo:* ${motivo}\n\nTu sorteo no es visible al público mientras esté pausado. Contáctanos si tienes dudas.\n\n— Equipo RifandoPlus`
  }
  if (accion === 'eliminado') {
    return `${base}\n*Estado:* ❌ eliminado\n*Motivo:* ${motivo}\n\nSi crees que esto es un error, contáctanos a la brevedad.\n\n— Equipo RifandoPlus`
  }
  return `${base}\n*Motivo:* ${motivo}\n\n— Equipo RifandoPlus`
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const { telefono, nombre, sorteoNombre, motivo, accion } = await req.json()
    if (!telefono) return NextResponse.json({ success: false, error: 'Sin teléfono' })

    const text   = buildMessage(nombre, sorteoNombre, accion, motivo)
    const result = await sendWhatsAppMessage(telefono, text)

    if (!result.ok) {
      console.warn('[notificar] WhatsApp send failed:', result.error)
    }

    // Return success regardless — the admin action already happened
    return NextResponse.json({ success: true, wa: result.ok })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
