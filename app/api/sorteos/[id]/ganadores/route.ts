import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireSorteoAccess } from '@/lib/supabase/guard'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSorteoAccess(params.id)
  if (access.error) return access.error

  const supabase = createAdminSupabaseClient() as any
  const { data, error } = await supabase
    .from('sorteo_ganadores')
    .select('*')
    .eq('sorteo_id', params.id)

  if (error) {
    console.error('[GET ganadores]:', error)
    return NextResponse.json({ error: 'Error al cargar los ganadores' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireSorteoAccess(params.id)
  if (access.error) return access.error

  const { premioId, numeroGanador, evidenciaUrls } = await req.json()

  if (!premioId || !numeroGanador?.trim() || !Array.isArray(evidenciaUrls) || evidenciaUrls.length === 0) {
    return NextResponse.json({ error: 'Falta el número de boleto ganador o la evidencia' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient() as any

  const { data: sorteo } = await supabase
    .from('sorteos')
    .select('estatus, total_numeros, es_loteria')
    .eq('id', params.id)
    .single()

  if (!sorteo) {
    return NextResponse.json({ error: 'Sorteo no encontrado' }, { status: 404 })
  }
  if (sorteo.estatus !== 'finalizado') {
    return NextResponse.json({ error: 'El sorteo debe estar finalizado para declarar ganadores' }, { status: 400 })
  }

  const digits = sorteo.es_loteria
    ? Math.round(Math.log10(sorteo.total_numeros))
    : String(sorteo.total_numeros).length
  const numeroNormalizado = String(numeroGanador).trim().padStart(digits, '0')

  const { data: boleto } = await supabase
    .from('boletos')
    .select('id, estatus, pedido_id')
    .eq('sorteo_id', params.id)
    .eq('numero', numeroNormalizado)
    .maybeSingle()

  if (!boleto || boleto.estatus !== 'pagado' || !boleto.pedido_id) {
    return NextResponse.json(
      { error: `El boleto #${numeroNormalizado} no tiene un pedido pagado asociado` },
      { status: 400 }
    )
  }

  const { error: upsertError } = await supabase
    .from('sorteo_ganadores')
    .upsert(
      {
        sorteo_id: params.id,
        premio_id: premioId,
        pedido_id: boleto.pedido_id,
        boleto_id: boleto.id,
        numero_ganador: numeroNormalizado,
        evidencia_urls: evidenciaUrls,
        declarado_por: access.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'sorteo_id,premio_id' }
    )

  if (upsertError) {
    console.error('[POST ganadores] upsert:', upsertError)
    return NextResponse.json({ error: 'Error al guardar el ganador' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
