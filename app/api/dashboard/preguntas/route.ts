import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/supabase/guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId, error } = await requireAuth()
  if (error) return error

  const supabase = createAdminSupabaseClient()

  const { data: sorteos } = await (supabase as any)
    .from('sorteos')
    .select('id')
    .eq('usuario_id', userId)

  if (!sorteos?.length) return NextResponse.json([])

  const ids = sorteos.map((s: any) => s.id)

  const { data, error: dbError } = await (supabase as any)
    .from('preguntas_sorteo')
    .select('*, sorteos(id, nombre)')
    .in('sorteo_id', ids)
    .order('created_at', { ascending: false })

  if (dbError) {
    console.error('[GET /api/dashboard/preguntas]', dbError)
    return NextResponse.json([])
  }
  return NextResponse.json(data ?? [])
}
