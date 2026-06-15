import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/guard'
import { publicarEnFacebook } from '@/lib/facebook'

export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const { sorteoId } = await req.json()
    if (!sorteoId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    const { data: sorteo, error } = await (supabase as any)
      .from('sorteos')
      .select('id, nombre, descripcion, precio_unitario, fecha_sorteo, total_numeros, premios(*)')
      .eq('id', sorteoId)
      .single()

    if (error || !sorteo) {
      return NextResponse.json({ error: 'Sorteo no encontrado' }, { status: 404 })
    }

    const facebook = await publicarEnFacebook(sorteo, sorteo.premios ?? [])
    if (!facebook.ok) {
      return NextResponse.json({ error: facebook.error }, { status: 500 })
    }

    await (supabase as any)
      .from('sorteos')
      .update({ facebook_publicado_at: new Date().toISOString() })
      .eq('id', sorteoId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[publicar-facebook] unexpected:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
