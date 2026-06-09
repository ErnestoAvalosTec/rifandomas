import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/guard'

export async function PATCH(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminSupabaseClient() as any
  const { premios } = await req.json() as { premios: { id: string; categoria: string }[] }

  for (const p of premios) {
    const { error } = await supabase
      .from('premios')
      .update({ categoria: p.categoria || null })
      .eq('id', p.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
