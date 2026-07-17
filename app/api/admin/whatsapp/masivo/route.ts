import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/guard'
import { normalizarTelefono } from '@/lib/whatsapp'
import { procesarCampana } from '@/lib/whatsapp-masivo'

export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { sorteoId, mensaje, filtroEstatus } = await req.json()
  if (!sorteoId || !mensaje?.trim() || !Array.isArray(filtroEstatus) || !filtroEstatus.length) {
    return NextResponse.json(
      { error: 'Faltan parámetros: sorteoId, mensaje y filtroEstatus son requeridos' },
      { status: 400 }
    )
  }

  const supabase = createAdminSupabaseClient() as any

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('cliente_telefono, cliente_nombre')
    .eq('sorteo_id', sorteoId)
    .in('estatus', filtroEstatus)

  const porTelefono = new Map<string, string>()
  for (const p of pedidos ?? []) {
    const tel = normalizarTelefono(p.cliente_telefono)
    if (tel && !porTelefono.has(tel)) porTelefono.set(tel, p.cliente_nombre)
  }

  if (porTelefono.size === 0) {
    return NextResponse.json({ error: 'No hay destinatarios para ese sorteo y esos estatus' }, { status: 400 })
  }

  const { data: campana, error: campanaError } = await supabase
    .from('campanas_whatsapp')
    .insert({
      sorteo_id: sorteoId,
      mensaje,
      filtro_estatus: filtroEstatus,
      total_destinatarios: porTelefono.size,
    })
    .select('id')
    .single()

  if (campanaError || !campana) {
    return NextResponse.json({ error: 'No se pudo crear la campaña' }, { status: 500 })
  }

  const destinatariosRows = Array.from(porTelefono, ([telefono, nombre]) => ({
    campana_id: campana.id,
    telefono,
    nombre,
  }))
  await supabase.from('campana_whatsapp_destinatarios').insert(destinatariosRows)

  // Fire-and-forget: corre en segundo plano en el proceso Node del VPS.
  // No se espera (await) porque la respuesta HTTP debe volver de inmediato
  // para que el admin vea la barra de progreso sin bloquear la petición.
  procesarCampana(campana.id).catch((err) => console.error('[masivo] Error procesando campaña:', err))

  return NextResponse.json({ campanaId: campana.id, totalDestinatarios: porTelefono.size })
}

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminSupabaseClient() as any
  const { data } = await supabase
    .from('campanas_whatsapp')
    .select('id, sorteo_id, mensaje, total_destinatarios, enviados, fallidos, estatus, created_at, completed_at, sorteos(nombre)')
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json(data ?? [])
}
