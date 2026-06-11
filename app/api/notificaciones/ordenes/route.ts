import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/supabase/guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId, error } = await requireAuth()
  if (error) return error

  const supabase = createAdminSupabaseClient() as any

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, ultima_revision_ordenes')
    .eq('id', userId)
    .single()

  const desde = perfil?.ultima_revision_ordenes ?? new Date(0).toISOString()

  if (perfil?.rol === 'admin') {
    const { count } = await supabase
      .from('pedidos')
      .select('id', { count: 'exact', head: true })
      .gt('created_at', desde)
    return NextResponse.json({ count: count ?? 0 })
  }

  const { data: sorteos } = await supabase.from('sorteos').select('id').eq('usuario_id', userId)
  const sorteoIds = (sorteos ?? []).map((s: any) => s.id)
  if (!sorteoIds.length) return NextResponse.json({ count: 0 })

  const { count } = await supabase
    .from('pedidos')
    .select('id', { count: 'exact', head: true })
    .gt('created_at', desde)
    .in('sorteo_id', sorteoIds)

  return NextResponse.json({ count: count ?? 0 })
}

export async function POST() {
  const { userId, error } = await requireAuth()
  if (error) return error

  const supabase = createAdminSupabaseClient() as any
  await supabase.from('perfiles').update({ ultima_revision_ordenes: new Date().toISOString() }).eq('id', userId)

  return NextResponse.json({ ok: true })
}
