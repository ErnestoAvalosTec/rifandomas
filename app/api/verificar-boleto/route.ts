import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET: búsqueda pública de un boleto por sorteo + número.
// Solo expone el primer nombre del cliente y el estatus del pedido —
// nada de apellidos, teléfono, correo ni otros datos personales.
// Usa el cliente con service-role porque "pedidos" no tiene política
// de lectura pública (solo el organizador ve sus propios pedidos).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sorteoId = searchParams.get('sorteo_id')
  const numero = searchParams.get('numero')?.trim()

  if (!sorteoId || !numero) {
    return NextResponse.json({ error: 'Selecciona un sorteo e ingresa un número.' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient() as any

  const { data: sorteo } = await supabase
    .from('sorteos')
    .select('id, total_numeros, es_loteria')
    .eq('id', sorteoId)
    .eq('estatus', 'activo')
    .maybeSingle()

  if (!sorteo) {
    return NextResponse.json({ error: 'Ese sorteo no está disponible.' }, { status: 404 })
  }

  // Mismo cálculo de dígitos que al generar los boletos (ver SorteoForm):
  // en sorteos tipo lotería, total_numeros = 10^dígitos.
  const digits = sorteo.es_loteria
    ? Math.round(Math.log10(sorteo.total_numeros))
    : String(sorteo.total_numeros).length
  const numeroNormalizado = numero.padStart(digits, '0')

  const { data: boleto } = await supabase
    .from('boletos')
    .select('numero, estatus, pedido_id')
    .eq('sorteo_id', sorteoId)
    .eq('numero', numeroNormalizado)
    .maybeSingle()

  if (!boleto) {
    return NextResponse.json({ error: `No encontramos el boleto #${numeroNormalizado} en ese sorteo.` }, { status: 404 })
  }

  if (!boleto.pedido_id) {
    return NextResponse.json({ numero: boleto.numero, disponible: true })
  }

  // No hay relación FK registrada entre boletos.pedido_id y pedidos en PostgREST,
  // así que se consulta el pedido por separado en lugar de usar un embed.
  const { data: pedido } = await supabase
    .from('pedidos')
    .select('cliente_nombre')
    .eq('id', boleto.pedido_id)
    .maybeSingle()

  const primerNombre = pedido?.cliente_nombre?.trim().split(/\s+/)[0] ?? ''
  const estatus = boleto.estatus === 'pagado' ? 'pagado' : 'pendiente_pago'

  return NextResponse.json({ numero: boleto.numero, nombre: primerNombre, estatus })
}
