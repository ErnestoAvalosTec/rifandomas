import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/guard'

export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminSupabaseClient() as any
  const { sorteoIds } = await req.json() as { sorteoIds: (string | null)[] }

  // Limpiar posiciones actuales
  await supabase.from('sorteos').update({ destacado_orden: null } as any).not('destacado_orden', 'is', null)

  // Asignar las nuevas posiciones (1, 2, 3)
  for (let i = 0; i < Math.min(sorteoIds?.length ?? 0, 3); i++) {
    const id = sorteoIds[i]
    if (!id) continue
    const { error } = await supabase
      .from('sorteos')
      .update({ destacado_orden: i + 1 } as any)
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
