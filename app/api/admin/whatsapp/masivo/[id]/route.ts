import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/guard'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminSupabaseClient() as any
  const { data } = await supabase
    .from('campanas_whatsapp')
    .select('id, total_destinatarios, enviados, fallidos, estatus, completed_at')
    .eq('id', params.id)
    .single()

  if (!data) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
  return NextResponse.json(data)
}
