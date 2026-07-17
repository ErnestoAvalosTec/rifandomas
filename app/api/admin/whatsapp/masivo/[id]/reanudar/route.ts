import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/guard'
import { procesarCampana } from '@/lib/whatsapp-masivo'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await requireAdmin()
  if (authError) return authError

  procesarCampana(params.id).catch((err) => console.error('[masivo] Error reanudando campaña:', err))
  return NextResponse.json({ success: true })
}
