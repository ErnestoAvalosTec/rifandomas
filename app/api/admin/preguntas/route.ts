import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminSupabaseClient()
  const { data, error } = await (supabase as any)
    .from('preguntas_sorteo')
    .select('*, sorteos(id, nombre, perfiles(nombre, apellidos))')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[GET /api/admin/preguntas]', error)
    return NextResponse.json([])
  }
  return NextResponse.json(data ?? [])
}
