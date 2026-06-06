import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

// POST: create/ensure the Evolution API instance exists
export async function POST() {
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
    const res = await fetch(`${config.api_url}/instance/create`, {
      method: 'POST',
      headers: {
        apikey: config.api_key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instanceName: config.instance_name,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    })
    const data = await res.json()
    // 409 = instance already exists — that's fine
    if (!res.ok && res.status !== 409) {
      return NextResponse.json({ error: data.message ?? 'Error al crear instancia' }, { status: res.status })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'No se pudo conectar con Evolution API' }, { status: 500 })
  }
}
