import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/guard'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const update: Record<string, unknown> = {}
  if (body.pregunta !== undefined) update.pregunta = body.pregunta.trim()
  if (body.nombre_autor !== undefined) update.nombre_autor = body.nombre_autor.trim()
  if (body.respuesta !== undefined) {
    const r = body.respuesta?.trim() ?? ''
    update.respuesta = r || null
    update.estado = r ? 'publicada' : 'pendiente'
    update.respondida_at = r ? new Date().toISOString() : null
  }

  const supabase = createAdminSupabaseClient()
  const { data, error } = await (supabase as any)
    .from('preguntas_sorteo')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminSupabaseClient()
  const { error } = await (supabase as any)
    .from('preguntas_sorteo')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
