import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/guard'
import { procesarCampana } from '@/lib/whatsapp-masivo'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await requireAdmin()
  if (authError) return authError

  // Escribe el estatus directamente aquí (en vez de depender de que
  // procesarCampana lo haga) porque el guard de concurrencia en
  // procesarCampana puede bloquear esta invocación si ya hay un loop vivo
  // para esta campaña (p. ej. seguía dormido en su delay entre envíos
  // cuando se dio "Detener" y luego "Reanudar" de inmediato). Si dejáramos
  // el reset dentro de procesarCampana, esa invocación bloqueada retornaría
  // sin nunca marcar "enviando", y el loop dormido despertaría, vería
  // "pausado" y terminaría — dejando la campaña atascada.
  const supabase = createAdminSupabaseClient() as any
  const { error } = await supabase
    .from('campanas_whatsapp')
    .update({ estatus: 'enviando' })
    .eq('id', params.id)
    .neq('estatus', 'enviando')

  if (error) {
    console.error('[masivo] Error al reanudar campaña:', error)
    return NextResponse.json({ error: 'No se pudo reanudar la campaña' }, { status: 500 })
  }

  procesarCampana(params.id).catch((err) => console.error('[masivo] Error reanudando campaña:', err))
  return NextResponse.json({ success: true })
}
