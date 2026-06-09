import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/guard'

// Sin esto, Next.js puede tratar esta ruta como estática (no usa cookies()) y
// cachear la respuesta — sirviendo siempre el mismo QR/error viejo en cada llamada.
export const dynamic = 'force-dynamic'

// GET: fetch the QR code base64 from Evolution API
export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminSupabaseClient()
  const { data: config } = await (supabase as any)
    .from('whatsapp_config')
    .select('api_url, api_key, instance_name')
    .eq('id', 1)
    .single()

  if (!config?.api_url || !config?.api_key) {
    return NextResponse.json({ error: 'WhatsApp no configurado' }, { status: 400 })
  }

  const baseUrl = config.api_url.replace(/\/$/, '')
  const headers = { apikey: config.api_key, 'Content-Type': 'application/json' }

  try {
    const res = await fetch(
      `${baseUrl}/instance/connect/${config.instance_name}`,
      { headers, cache: 'no-store' }
    )

    const raw = await res.json()

    if (!res.ok) {
      console.error('[QR] Evolution API error:', res.status, raw)
      return NextResponse.json(
        { error: raw?.message ?? raw?.error ?? `Error ${res.status} de Evolution API` },
        { status: res.status }
      )
    }

    // Evolution API devuelve base64 en distintos lugares según la versión:
    // v1/v2: { base64: "data:image/png;base64,..." }
    // v2 nested: { qrcode: { base64: "..." } }
    // Algunos builds: { code: "...", base64: "..." }
    // Si la instancia ya está conectada, Evolution API devuelve el estado en lugar del QR
    const instanceState = raw?.instance?.state ?? raw?.state
    if (instanceState === 'open') {
      return NextResponse.json({ alreadyConnected: true })
    }

    const b64 =
      raw?.base64 ??
      raw?.qrcode?.base64 ??
      raw?.qr?.base64 ??
      null

    if (!b64) {
      console.error('[QR] Respuesta sin base64:', JSON.stringify(raw))
      return NextResponse.json(
        { error: 'Evolution API no devolvió el QR. Respuesta: ' + JSON.stringify(raw).slice(0, 200) },
        { status: 502 }
      )
    }

    // Asegurarse de que sea un data URL válido
    const src = b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`
    return NextResponse.json({ base64: src })

  } catch (err) {
    console.error('[QR] fetch error:', err)
    return NextResponse.json({ error: 'No se pudo conectar con Evolution API' }, { status: 500 })
  }
}
