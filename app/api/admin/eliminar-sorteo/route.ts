import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/guard'

export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const { sorteoId, motivo } = await req.json()
    if (!sorteoId) return NextResponse.json({ error: 'Falta sorteoId' }, { status: 400 })

    const supabase = createAdminSupabaseClient() as any

    // Los pedidos del sorteo eliminado dejan de tener sentido: se borran
    // (pedido_boletos cae en cascada por su FK on delete cascade).
    const { error: pedidosError } = await supabase
      .from('pedidos')
      .delete()
      .eq('sorteo_id', sorteoId)

    if (pedidosError) {
      console.error('[eliminar-sorteo] pedidos:', pedidosError)
      return NextResponse.json({ error: 'Error al eliminar los pedidos del sorteo' }, { status: 500 })
    }

    // boletos.pedido_id no tiene FK: limpiar referencias colgantes a los pedidos borrados.
    const { error: boletosError } = await supabase
      .from('boletos')
      .update({ estatus: 'disponible', pedido_id: null })
      .eq('sorteo_id', sorteoId)

    if (boletosError) {
      console.error('[eliminar-sorteo] boletos:', boletosError)
      return NextResponse.json({ error: 'Error al limpiar los boletos del sorteo' }, { status: 500 })
    }

    const { error: sorteoError } = await supabase
      .from('sorteos')
      .update({ estatus: 'eliminado', motivo_rechazo: motivo ?? null })
      .eq('id', sorteoId)

    if (sorteoError) {
      console.error('[eliminar-sorteo] sorteo:', sorteoError)
      return NextResponse.json({ error: 'Error al eliminar el sorteo' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[eliminar-sorteo] unexpected:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
