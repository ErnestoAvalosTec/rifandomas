import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/guard'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminSupabaseClient() as any
  await supabase
    .from('campanas_whatsapp')
    .update({ estatus: 'pausado' })
    .eq('id', params.id)
    .eq('estatus', 'enviando')

  return NextResponse.json({ success: true })
}
