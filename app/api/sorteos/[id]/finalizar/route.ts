import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireSorteoAccess } from '@/lib/supabase/guard'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSorteoAccess(params.id)
  if (access.error) return access.error

  const supabase = createAdminSupabaseClient() as any

  const { data: sorteo } = await supabase
    .from('sorteos')
    .select('estatus')
    .eq('id', params.id)
    .single()

  if (!sorteo) {
    return NextResponse.json({ error: 'Sorteo no encontrado' }, { status: 404 })
  }
  if (sorteo.estatus !== 'activo') {
    return NextResponse.json({ error: 'Solo se puede finalizar un sorteo activo' }, { status: 400 })
  }

  // Atomic update: filter by id AND estatus to prevent TOCTOU race
  const { data: updated, error } = await supabase
    .from('sorteos')
    .update({ estatus: 'finalizado' })
    .eq('id', params.id)
    .eq('estatus', 'activo')
    .select()

  if (error) {
    console.error('[finalizar-sorteo] update:', error)
    return NextResponse.json({ error: 'Error al finalizar el sorteo' }, { status: 500 })
  }

  // No rows affected means status changed between check and update
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'Solo se puede finalizar un sorteo activo' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
