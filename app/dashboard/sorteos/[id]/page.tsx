import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { SorteoDetalleAcciones } from '@/components/dashboard/SorteoDetalleAcciones'
import type { Database } from '@/types/database.types'

type SorteoRow = Database['public']['Tables']['sorteos']['Row']
type PremioRow = Database['public']['Tables']['premios']['Row']

const ESTATUS_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  pendiente: 'Pendiente',
  activo: 'Activo',
  pausado: 'Pausado',
  rechazado: 'Rechazado',
  finalizado: 'Finalizado',
  eliminado: 'Eliminado',
}

const LUGAR_LABEL: Record<number, string> = { 1: '1er Premio', 2: '2do Premio', 3: '3er Premio', 4: '4to Premio', 5: '5to Premio' }

export default async function SorteoDetallePage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) notFound()

  const { data: sorteo } = await supabase
    .from('sorteos')
    .select('*, premios(*)')
    .eq('id', params.id)
    .eq('usuario_id', session.user.id)
    .single()

  if (!sorteo) notFound()

  const typed = sorteo as SorteoRow & { premios: PremioRow[] }

  const { data: boletos } = await supabase
    .from('boletos')
    .select('estatus')
    .eq('sorteo_id', params.id)
    .in('estatus', ['reservado', 'pagado'])

  const vendidos = boletos?.length ?? 0

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-title text-3xl text-white tracking-wide">{typed.nombre}</h1>
          <p className="text-brand-muted font-body text-sm mt-1">
            {formatDate(typed.fecha_sorteo)} · {vendidos}/{typed.total_numeros} boletos · {formatCurrency(typed.precio_unitario)}/bol
          </p>
        </div>
        <Badge variant={typed.estatus as any}>{ESTATUS_LABEL[typed.estatus]}</Badge>
      </div>

      {typed.descripcion && (
        <p className="text-brand-muted font-body text-sm mb-6">{typed.descripcion}</p>
      )}

      <div className="space-y-3 mb-8">
        {typed.premios.slice().sort((a, b) => a.lugar - b.lugar).map((premio) => (
          <div key={premio.id} className="flex items-center gap-4 p-4 rounded-xl bg-brand-card border border-brand-border">
            {premio.imagen_url ? (
              <img src={premio.imagen_url} alt={premio.nombre} className="w-16 h-16 object-contain rounded-lg bg-white p-1" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-brand-bg border border-brand-border" />
            )}
            <div>
              <p className="text-[10px] font-ui font-semibold text-brand-muted uppercase tracking-wide">
                {LUGAR_LABEL[premio.lugar] ?? `${premio.lugar}° Premio`}
              </p>
              <p className="font-ui font-semibold text-white text-sm">{premio.nombre}</p>
            </div>
          </div>
        ))}
      </div>

      <SorteoDetalleAcciones sorteoId={typed.id} estatus={typed.estatus} />
    </div>
  )
}
