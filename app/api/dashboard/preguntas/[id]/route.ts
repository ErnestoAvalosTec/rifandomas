import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/supabase/guard'

export const dynamic = 'force-dynamic'

async function verificarPropiedad(preguntaId: string, userId: string) {
  const supabase = createAdminSupabaseClient()
  const { data } = await (supabase as any)
    .from('preguntas_sorteo')
    .select('id, sorteos(usuario_id)')
    .eq('id', preguntaId)
    .single()

  if (!data) return { ok: false, status: 404, msg: 'No encontrada' }
  if (data.sorteos?.usuario_id !== userId) return { ok: false, status: 403, msg: 'Acceso denegado' }
  return { ok: true }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, error } = await requireAuth()
  if (error) return error

  const ownership = await verificarPropiedad(params.id, userId)
  if (!ownership.ok) return NextResponse.json({ error: ownership.msg }, { status: ownership.status })

  const { respuesta } = await req.json().catch(() => ({}))
  if (!respuesta?.trim()) return NextResponse.json({ error: 'Respuesta requerida' }, { status: 400 })

  const supabase = createAdminSupabaseClient()
  const { data, error: dbError } = await (supabase as any)
    .from('preguntas_sorteo')
    .update({ respuesta: respuesta.trim(), estado: 'publicada', respondida_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, error } = await requireAuth()
  if (error) return error

  const ownership = await verificarPropiedad(params.id, userId)
  if (!ownership.ok) return NextResponse.json({ error: ownership.msg }, { status: ownership.status })

  const supabase = createAdminSupabaseClient()
  const { error: dbError } = await (supabase as any)
    .from('preguntas_sorteo')
    .delete()
    .eq('id', params.id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
