import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { requireAdmin } from '@/lib/supabase/guard'

// POST: send a WhatsApp message via Evolution API
export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { number, text } = await req.json()
  if (!number || !text) {
    return NextResponse.json({ error: 'Faltan parámetros: number y text son requeridos' }, { status: 400 })
  }
  const result = await sendWhatsAppMessage(number, text)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
