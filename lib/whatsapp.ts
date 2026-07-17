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

// Normaliza a solo dígitos y agrega el código de país (52) si faltaba —
// compartida con la deduplicación de mensajes masivos (misma regla de
// normalización debe usarse en ambos lados o el dedupe por teléfono falla).
export function normalizarTelefono(numero: string): string {
  const digits = numero.replace(/\D/g, '')
  if (!digits) return ''
  return digits.length === 10 ? `52${digits}` : digits
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

  const normalized = normalizarTelefono(number)
  if (!normalized) return { ok: false, error: 'invalid_number' }

  const baseUrl = config.api_url.replace(/\/$/, '')

  // Un retraso fijo entre "conectado" y "mensaje enviado" es justo el patrón
  // que Meta usa para detectar campañas automatizadas y restringir la cuenta.
  // Variarlo simula el tiempo que tardaría una persona real en escribir —
  // Evolution API muestra "escribiendo..." al destinatario durante ese lapso.
  const delay = 1500 + Math.floor(Math.random() * 2500)

  try {
    const res = await fetch(
      `${baseUrl}/message/sendText/${config.instance_name}`,
      {
        method: 'POST',
        headers: {
          apikey: config.api_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number: normalized, text, delay }),
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
