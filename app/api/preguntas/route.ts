import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const PSEUDONIMOS = [
  'Participante Curioso', 'Visitante Animado', 'Ganador Esperanzado',
  'Jugador Entusiasta', 'Comprador Activo', 'Fan del Sorteo',
  'Apostador Valiente', 'Visitante Interesado', 'Participante Emocionado',
  'Usuario Activo', 'Comprador Potencial', 'Participante Entusiasta',
]

export async function GET(req: NextRequest) {
  const sorteoId = req.nextUrl.searchParams.get('sorteo_id')
  if (!sorteoId) return NextResponse.json({ error: 'sorteo_id requerido' }, { status: 400 })

  const supabase = createAdminSupabaseClient()
  const { data, error } = await (supabase as any)
    .from('preguntas_sorteo')
    .select('id, nombre_autor, pregunta, respuesta, created_at, respondida_at')
    .eq('sorteo_id', sorteoId)
    .eq('estado', 'publicada')
    .order('respondida_at', { ascending: false })

  if (error) {
    console.error('[GET /api/preguntas]', error)
    return NextResponse.json([])
  }
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  const { sorteo_id, nombre_autor, pregunta } = body

  if (!sorteo_id || !pregunta?.trim()) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }
  if (pregunta.length > 400) {
    return NextResponse.json({ error: 'Pregunta demasiado larga' }, { status: 400 })
  }

  const nombreFinal = nombre_autor?.trim()?.slice(0, 50) ||
    PSEUDONIMOS[Math.floor(Math.random() * PSEUDONIMOS.length)]

  const supabase = createAdminSupabaseClient()

  const { data: sorteo } = await (supabase as any)
    .from('sorteos')
    .select('id')
    .eq('id', sorteo_id)
    .eq('estatus', 'activo')
    .single()

  if (!sorteo) return NextResponse.json({ error: 'Sorteo no encontrado' }, { status: 404 })

  const { data, error } = await (supabase as any)
    .from('preguntas_sorteo')
    .insert({ sorteo_id, nombre_autor: nombreFinal, pregunta: pregunta.trim(), estado: 'pendiente' })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/preguntas]', error)
    return NextResponse.json({ error: 'Error al enviar pregunta' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
