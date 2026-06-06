import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createAdminSupabaseClient() as any
  const { sorteoId } = await req.json()

  // Remove current destacado
  await supabase.from('sorteos').update({ destacado: false } as any).eq('destacado', true as any)

  if (sorteoId) {
    const { error } = await supabase
      .from('sorteos')
      .update({ destacado: true } as any)
      .eq('id', sorteoId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
