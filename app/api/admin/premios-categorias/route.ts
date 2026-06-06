import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
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
