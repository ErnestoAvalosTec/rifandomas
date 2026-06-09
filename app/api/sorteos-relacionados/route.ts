import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sorteoId = req.nextUrl.searchParams.get('sorteo_id')
  if (!sorteoId) return NextResponse.json([])

  const supabase = createAdminSupabaseClient()

  // Get current sorteo to know owner and categories
  const { data: sorteo } = await (supabase as any)
    .from('sorteos')
    .select('id, usuario_id, premios(categoria)')
    .eq('id', sorteoId)
    .single()

  if (!sorteo) return NextResponse.json([])

  const categorias: string[] = (sorteo.premios ?? [])
    .map((p: any) => p.categoria)
    .filter(Boolean)

  // 1. Same owner's active sorteos (excluding current)
  const { data: mismoOrganizador } = await (supabase as any)
    .from('sorteos')
    .select('id, nombre, precio_unitario, premios(lugar, nombre, imagen_url, valor_estimado)')
    .eq('usuario_id', sorteo.usuario_id)
    .eq('estatus', 'activo')
    .neq('id', sorteoId)
    .limit(8)

  let resultado: any[] = mismoOrganizador ?? []

  // 2. If fewer than 4, supplement with category matches from other organizers
  if (resultado.length < 4 && categorias.length) {
    const existingIds = resultado.map((s: any) => s.id).concat(sorteoId)
    const { data: porCategoria } = await (supabase as any)
      .from('sorteos')
      .select('id, nombre, precio_unitario, premios!inner(lugar, nombre, imagen_url, valor_estimado, categoria)')
      .eq('estatus', 'activo')
      .in('premios.categoria', categorias)
      .not('id', 'in', `(${existingIds.map((id: string) => `"${id}"`).join(',')})`)
      .limit(8 - resultado.length)

    resultado = [...resultado, ...(porCategoria ?? [])]
  }

  return NextResponse.json(resultado.slice(0, 8))
}
