import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

// GET: check the WhatsApp connection state
export async function GET() {
  const supabase = createAdminSupabaseClient()
  const { data: config } = await (supabase as any)
    .from('whatsapp_config')
    .select('api_url, api_key, instance_name')
    .eq('id', 1)
    .single()

  if (!config?.api_url || !config?.api_key) {
    return NextResponse.json({ state: 'unconfigured' })
  }

  try {
    const res = await fetch(
      `${config.api_url}/instance/connectionState/${config.instance_name}`,
      { headers: { apikey: config.api_key } }
    )
    if (!res.ok) return NextResponse.json({ state: 'close' })
    const data = await res.json()
    // Evolution API v2 returns { instance: { state: 'open'|'close'|'connecting' } }
    const state = data?.instance?.state ?? data?.state ?? 'close'
    return NextResponse.json({ state })
  } catch {
    return NextResponse.json({ state: 'error' })
  }
}
