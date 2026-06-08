import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { Plus, Eye, Pencil } from 'lucide-react'
import type { Database } from '@/types/database.types'

type SorteoRow = Database['public']['Tables']['sorteos']['Row']

const ESTATUS_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  pendiente: 'Pendiente',
  activo: 'Activo',
  rechazado: 'Rechazado',
  finalizado: 'Finalizado',
}

export default async function SorteosPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data: sorteosData } = await supabase
    .from('sorteos')
    .select('id, nombre, fecha_sorteo, total_numeros, estatus, motivo_rechazo, created_at')
    .eq('usuario_id', session.user.id)
    .order('created_at', { ascending: false })

  const sorteos = (sorteosData ?? []) as Pick<SorteoRow, 'id' | 'nombre' | 'fecha_sorteo' | 'total_numeros' | 'estatus' | 'motivo_rechazo' | 'created_at'>[]
  const sorteoIds = sorteos.map((s) => s.id)

  const { data: boletoData } = sorteoIds.length
    ? await supabase
        .from('boletos')
        .select('sorteo_id, estatus')
        .in('sorteo_id', sorteoIds)
        .in('estatus', ['reservado', 'pagado'])
    : { data: [] }

  const vendidosPorSorteo: Record<string, number> = {}
  ;(boletoData ?? []).forEach((b: { sorteo_id: string; estatus: string }) => {
    vendidosPorSorteo[b.sorteo_id] = (vendidosPorSorteo[b.sorteo_id] ?? 0) + 1
  })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-title text-4xl text-white tracking-wide">MIS SORTEOS</h1>
          <p className="text-brand-muted font-body text-sm">Gestiona todos tus sorteos.</p>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link href="/dashboard/sorteos/nuevo"><Plus className="w-4 h-4" />Nuevo Sorteo</Link>
        </Button>
      </div>

      {!sorteos.length ? (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-12 text-center">
          <p className="text-brand-muted font-body mb-4">No tienes sorteos creados.</p>
          <Button asChild><Link href="/dashboard/sorteos/nuevo">Crear mi primer sorteo</Link></Button>
        </div>
      ) : (
        <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
          {/* ── Tarjetas móvil ── */}
          <div className="sm:hidden divide-y divide-brand-border">
            {sorteos.map((s) => {
              const vendidos = vendidosPorSorteo[s.id] ?? 0
              const puedeEditar = s.estatus === 'borrador' || s.estatus === 'rechazado'
              return (
                <div key={s.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-ui font-semibold text-white text-sm truncate flex-1">{s.nombre}</p>
                    <Badge variant={s.estatus as any}>{ESTATUS_LABEL[s.estatus]}</Badge>
                  </div>
                  {s.estatus === 'rechazado' && s.motivo_rechazo && (
                    <p className="text-xs text-red-400 truncate">Motivo: {s.motivo_rechazo}</p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-brand-muted">{formatDate(s.fecha_sorteo)}</span>
                    <span className="text-xs text-brand-muted">
                      <span className="text-white font-semibold">{vendidos}</span>/{s.total_numeros} boletos
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button asChild variant="secondary" size="sm" className="gap-1.5 flex-1">
                      <Link href={`/dashboard/sorteos/${s.id}`}><Eye className="w-3.5 h-3.5" />Ver</Link>
                    </Button>
                    {puedeEditar && (
                      <Button asChild variant="secondary" size="sm" className="gap-1.5 flex-1">
                        <Link href={`/dashboard/sorteos/${s.id}?editar=1`}><Pencil className="w-3.5 h-3.5" />Editar</Link>
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Tabla desktop ── */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border">
                  {['Nombre', 'Fecha sorteo', 'Boletos', 'Estatus', 'Acciones'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-brand-muted font-ui uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorteos.map((s) => {
                  const vendidos = vendidosPorSorteo[s.id] ?? 0
                  const puedeEditar = s.estatus === 'borrador' || s.estatus === 'rechazado'
                  return (
                    <tr key={s.id} className="border-b border-brand-border/50 last:border-0 hover:bg-brand-border/20 transition-colors">
                      <td className="px-4 py-3 font-ui text-white">
                        {s.nombre}
                        {s.estatus === 'rechazado' && s.motivo_rechazo && (
                          <p className="text-xs text-red-400 mt-0.5 truncate max-w-[200px]" title={s.motivo_rechazo}>
                            Motivo: {s.motivo_rechazo}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-brand-muted">{formatDate(s.fecha_sorteo)}</td>
                      <td className="px-4 py-3 text-brand-muted">
                        <span className="text-white font-semibold">{vendidos}</span>/{s.total_numeros}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={s.estatus as any}>{ESTATUS_LABEL[s.estatus]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button asChild variant="ghost" size="icon" className="w-8 h-8">
                            <Link href={`/dashboard/sorteos/${s.id}`}><Eye className="w-3.5 h-3.5" /></Link>
                          </Button>
                          {puedeEditar && (
                            <Button asChild variant="ghost" size="icon" className="w-8 h-8">
                              <Link href={`/dashboard/sorteos/${s.id}?editar=1`}><Pencil className="w-3.5 h-3.5" /></Link>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
