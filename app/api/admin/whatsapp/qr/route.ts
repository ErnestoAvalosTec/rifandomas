import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

// GET: fetch the QR code base64 from Evolution API
export async function GET() {
  const supabase = createAdminSupabaseClient()
  const { data: config } = await (supabase as any)
    .from('whatsapp_config')
    .select('api_url, api_key, instance_name')
    .eq('id', 1)
    .single()

  if (!config?.api_url || !config?.api_key) {
    return NextResponse.json({ error: 'WhatsApp no configurado' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `${config.api_url}/instance/connect/${config.instance_name}`,
      { headers: { apikey: config.api_key } }
    )
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data.message ?? 'Error al obtener QR' }, { status: res.status })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'No se pudo conectar con Evolution API' }, { status: 500 })
  }
}
