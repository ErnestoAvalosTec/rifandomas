import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

// DELETE: logout the WhatsApp instance
export async function DELETE() {
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
      `${config.api_url}/instance/logout/${config.instance_name}`,
      {
        method: 'DELETE',
        headers: { apikey: config.api_key },
      }
    )
    if (!res.ok && res.status !== 404) {
      const data = await res.json()
      return NextResponse.json({ error: data.message ?? 'Error al desconectar' }, { status: res.status })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'No se pudo conectar con Evolution API' }, { status: 500 })
  }
}
