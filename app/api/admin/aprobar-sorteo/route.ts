import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { sorteoId, totalNumeros } = await req.json()
    if (!sorteoId || !totalNumeros) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    // Leer flag de lotería del sorteo
    const { data: sorteoData } = await (supabase as any)
      .from('sorteos')
      .select('es_loteria')
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

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[aprobar-sorteo] unexpected:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
