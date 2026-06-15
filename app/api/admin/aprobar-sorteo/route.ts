import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/guard'
import { publicarEnFacebook } from '@/lib/facebook'

export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const { sorteoId, totalNumeros, publicarEnFacebook: publicar } = await req.json()
    if (!sorteoId || !totalNumeros) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    // Leer datos del sorteo (incluye flag de lotería y premios para el post de Facebook)
    const { data: sorteoData } = await (supabase as any)
      .from('sorteos')
      .select('id, nombre, descripcion, precio_unitario, fecha_sorteo, total_numeros, es_loteria, premios(*)')
      .eq('id', sorteoId)
      .single()

    const esLoteria: boolean = sorteoData?.es_loteria ?? false

    // Eliminar boletos previos si existieran (reintento seguro)
    await (supabase as any).from('boletos').delete().eq('sorteo_id', sorteoId)

    // Generar boletos en lotes de 500
    // - Modo normal:  001 → 100  (empieza en 1, dígitos = longitud de totalNumeros)
    // - Modo lotería: 000 → 999  (empieza en 0, dígitos = log10 de totalNumeros)
    const digits = esLoteria ? Math.round(Math.log10(totalNumeros)) : String(totalNumeros).length

    const boletos = Array.from({ length: totalNumeros }, (_, i) => ({
      sorteo_id: sorteoId,
      numero: String(esLoteria ? i : i + 1).padStart(digits, '0'),
      estatus: 'disponible',
    }))

    for (let i = 0; i < boletos.length; i += 500) {
      const { error } = await (supabase as any).from('boletos').insert(boletos.slice(i, i + 500))
      if (error) {
        console.error('[aprobar-sorteo] insert boletos:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    const { error: errSorteo } = await (supabase as any)
      .from('sorteos')
      .update({ estatus: 'activo' })
      .eq('id', sorteoId)

    if (errSorteo) {
      console.error('[aprobar-sorteo] update sorteo:', errSorteo)
      return NextResponse.json({ error: errSorteo.message }, { status: 500 })
    }

    let facebook: { ok: boolean; error?: string } | undefined
    if (publicar && sorteoData) {
      facebook = await publicarEnFacebook(sorteoData, sorteoData.premios ?? [])
      if (facebook.ok) {
        await (supabase as any)
          .from('sorteos')
          .update({ facebook_publicado_at: new Date().toISOString() })
          .eq('id', sorteoId)
      }
    }

    return NextResponse.json({ success: true, facebook })
  } catch (err) {
    console.error('[aprobar-sorteo] unexpected:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
