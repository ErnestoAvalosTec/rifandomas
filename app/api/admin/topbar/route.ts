import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const supabase = createAdminSupabaseClient()
  const body = await req.json()

  const { error } = await supabase
    .from('marca')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
