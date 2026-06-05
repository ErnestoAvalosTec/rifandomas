'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import type { Database } from '@/types/database.types'

type SorteoRow = Database['public']['Tables']['sorteos']['Row']

interface SorteoConPerfil extends SorteoRow {
  perfiles: { nombre: string; apellidos: string; telefono: string | null } | null
}

export default function AdminSorteosPage() {
  const supabase = createClient()
  const [sorteos, setSorteos] = useState<SorteoConPerfil[]>([])
  const [filtro, setFiltro] = useState('pendiente')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [rechazando, setRechazando] = useState<string | null>(null)

  useEffect(() => {
    const cargar = async () => {
      const { data } = await (supabase as any)
        .from('sorteos')
        .select('*, perfiles(nombre, apellidos, telefono)')
        .eq('estatus', filtro)
        .order('created_at', { ascending: false })
      setSorteos(data ?? [])
    }
    cargar()
  }, [filtro])

  const aprobar = async (sorteo: SorteoConPerfil) => {
    const boletos = Array.from({ length: sorteo.total_numeros }, (_, i) => ({
      sorteo_id: sorteo.id,
      numero: String(i + 1).padStart(4, '0'),
      estatus: 'disponible' as const,
    }))

    for (let i = 0; i < boletos.length; i += 500) {
      const { error } = await (supabase as any).from('boletos').insert(boletos.slice(i, i + 500))
      if (error) { toast.error('Error al generar boletos'); return }
    }

    const { error } = await (supabase as any).from('sorteos').update({ estatus: 'activo' }).eq('id', sorteo.id)
    if (error) { toast.error('Error al aprobar'); return }

    toast.success(`Sorteo "${sorteo.nombre}" aprobado y ${sorteo.total_numeros} boletos generados.`)
    setSorteos((prev) => prev.filter((s) => s.id !== sorteo.id))
  }

  const rechazar = async (id: string) => {
    if (!motivoRechazo.trim()) { toast.error('Escribe el motivo del rechazo'); return }
    const { error } = await (supabase as any)
      .from('sorteos')
      .update({ estatus: 'rechazado', motivo_rechazo: motivoRechazo })
      .eq('id', id)
    if (error) { toast.error('Error'); return }
    toast.success('Sorteo rechazado')
    setSorteos((prev) => prev.filter((s) => s.id !== id))
    setRechazando(null)
    setMotivoRechazo('')
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-title text-4xl text-white tracking-wide">GESTIÓN DE SORTEOS</h1>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {['pendiente', 'activo', 'rechazado', 'finalizado'].map((f) => (
          <button key={f} onClick={() => setFiltro(f)} className={`px-3 py-1.5 rounded-lg text-xs font-ui capitalize cursor-pointer transition-colors ${filtro === f ? 'bg-primary text-white' : 'bg-brand-card border border-brand-border text-brand-muted hover:text-white'}`}>
            {f}
          </button>
        ))}
      </div>

      {!sorteos.length ? (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-12 text-center">
          <p className="text-brand-muted font-body">No hay sorteos con estatus "{filtro}".</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorteos.map((s) => (
            <div key={s.id} className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-ui font-semibold text-white">{s.nombre}</h3>
                    <Badge variant={s.estatus as any}>{s.estatus}</Badge>
                  </div>
                  <p className="text-xs text-brand-muted mt-1 font-body">
                    {s.perfiles?.nombre} {s.perfiles?.apellidos} · {formatDate(s.fecha_sorteo)} · {s.total_numeros} números · {formatCurrency(s.precio_unitario)}/boleto
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {s.estatus === 'pendiente' && (
                    <>
                      <Button size="sm" onClick={() => aprobar(s)} className="gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />Aprobar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRechazando(rechazando === s.id ? null : s.id)} className="gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10">
                        <XCircle className="w-3.5 h-3.5" />Rechazar
                      </Button>
                    </>
                  )}
                  <button onClick={() => setExpandido(expandido === s.id ? null : s.id)} className="p-1 text-brand-muted hover:text-white transition-colors cursor-pointer">
                    {expandido === s.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {expandido === s.id && (
                <div className="border-t border-brand-border px-5 py-4">
                  <p className="text-sm text-brand-muted font-body">{s.descripcion ?? 'Sin descripción.'}</p>
                </div>
              )}
              {rechazando === s.id && (
                <div className="border-t border-brand-border px-5 py-4 space-y-3">
                  <textarea
                    className="w-full rounded-lg border border-brand-border bg-brand-bg text-white text-sm p-3 placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-none"
                    placeholder="Motivo del rechazo (visible para el organizador)..."
                    value={motivoRechazo}
                    onChange={(e) => setMotivoRechazo(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setRechazando(null)}>Cancelar</Button>
                    <Button size="sm" variant="destructive" onClick={() => rechazar(s.id)} className="bg-red-600 hover:bg-red-700">
                      Confirmar rechazo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
