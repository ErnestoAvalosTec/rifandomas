import { createAdminSupabaseClient } from '@/lib/supabase/server'

interface WaConfig {
  api_url: string
  api_key: string
  instance_name: string
}

async function getWaConfig(): Promise<WaConfig | null> {
  const supabase = createAdminSupabaseClient()
  const { data } = await (supabase as any)
    .from('whatsapp_config')
    .select('api_url, api_key, instance_name')
    .eq('id', 1)
    .single()
  if (!data?.api_url || !data?.api_key) return null
  return data as WaConfig
}

export async function sendWhatsAppMessage(
  number: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const config = await getWaConfig()
  if (!config) {
    console.warn('[WA] Not configured — message not sent')
    return { ok: false, error: 'not_configured' }
  }

  // Normalize: digits only, ensure Mexican country code (52) is present
  const digits = number.replace(/\D/g, '')
  if (!digits) return { ok: false, error: 'invalid_number' }
  const normalized = digits.length === 10 ? `52${digits}` : digits

  try {
    const res = await fetch(
      `${config.api_url}/message/sendText/${config.instance_name}`,
      {
        method: 'POST',
        headers: {
          apikey: config.api_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number: normalized, text }),
      }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[WA] Send failed:', err)
      return { ok: false, error: (err as any).message ?? 'send_failed' }
    }
    return { ok: true }
  } catch (e) {
    console.error('[WA] Connection error:', e)
    return { ok: false, error: 'connection_error' }
  }
}
