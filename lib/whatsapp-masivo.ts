import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

function delayAleatorio(minMs: number, maxMs: number): Promise<void> {
  const ms = minMs + Math.floor(Math.random() * (maxMs - minMs))
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Actualiza los contadores en vivo y devuelve el estatus actual de la
// campaña — se combina en una sola llamada para no agregar un round-trip
// extra por destinatario solo para detectar si alguien le dio "Detener".
async function actualizarContadores(supabase: any, campanaId: string): Promise<string> {
  const { count: enviados } = await supabase
    .from('campana_whatsapp_destinatarios')
    .select('*', { count: 'exact', head: true })
    .eq('campana_id', campanaId)
    .eq('estatus', 'enviado')
  const { count: fallidos } = await supabase
    .from('campana_whatsapp_destinatarios')
    .select('*', { count: 'exact', head: true })
    .eq('campana_id', campanaId)
    .eq('estatus', 'error')
  const { data } = await supabase
    .from('campanas_whatsapp')
    .update({ enviados: enviados ?? 0, fallidos: fallidos ?? 0 })
    .eq('id', campanaId)
    .select('estatus')
    .single()
  return data?.estatus ?? 'enviando'
}

// Recorre los destinatarios "pendiente" de una campaña, uno por uno, con un
// delay aleatorio de 8-15s entre cada envío (además del "escribiendo..." que
// sendWhatsAppMessage ya simula por mensaje) para evitar el patrón de ráfaga
// que WhatsApp asocia con campañas automatizadas. Idempotente: si no quedan
// destinatarios "pendiente" (campaña ya completada), solo re-marca completado.
// Reanudable: si la campaña estaba "pausado" (o "enviando" colgada por un
// reinicio del servidor), la vuelve a marcar "enviando" antes de procesar el
// primer destinatario. Pausable: antes de cada envío revisa el estatus real
// de la campaña — si ya no es "enviando" (alguien le dio "Detener"), corta el
// loop sin marcar "completado". El mensaje que ya se estaba enviando en ese
// instante sí se termina de mandar (no se puede cancelar una petición HTTP a
// Evolution API a medias); el corte ocurre antes del siguiente destinatario.
export async function procesarCampana(campanaId: string): Promise<void> {
  const supabase = createAdminSupabaseClient() as any

  const { data: campana } = await supabase
    .from('campanas_whatsapp')
    .select('mensaje, estatus')
    .eq('id', campanaId)
    .single()
  if (!campana) return

  if (campana.estatus !== 'enviando') {
    await supabase.from('campanas_whatsapp').update({ estatus: 'enviando' }).eq('id', campanaId)
  }

  const { data: destinatarios } = await supabase
    .from('campana_whatsapp_destinatarios')
    .select('id, telefono, nombre')
    .eq('campana_id', campanaId)
    .eq('estatus', 'pendiente')
    .order('id', { ascending: true })

  for (const destinatario of destinatarios ?? []) {
    const texto = campana.mensaje.replaceAll('{nombre}', destinatario.nombre || 'ahí')
    const result = await sendWhatsAppMessage(destinatario.telefono, texto)

    await supabase
      .from('campana_whatsapp_destinatarios')
      .update({
        estatus: result.ok ? 'enviado' : 'error',
        enviado_at: result.ok ? new Date().toISOString() : null,
      })
      .eq('id', destinatario.id)

    const estatusActual = await actualizarContadores(supabase, campanaId)
    if (estatusActual !== 'enviando') return

    await delayAleatorio(8000, 15000)
  }

  await supabase
    .from('campanas_whatsapp')
    .update({ estatus: 'completado', completed_at: new Date().toISOString() })
    .eq('id', campanaId)
}
