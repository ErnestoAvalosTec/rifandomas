'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatCurrency, CATEGORIAS } from '@/lib/utils'
import {
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Pencil,
  PauseCircle, Trash2, PlayCircle, Plus, Loader2, Tag, MoreHorizontal, Facebook, Trophy,
} from 'lucide-react'
import Link from 'next/link'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import type { Database } from '@/types/database.types'
import { GanadoresManager } from '@/components/shared/GanadoresManager'

type SorteoRow = Database['public']['Tables']['sorteos']['Row']
type Estatus = SorteoRow['estatus']

interface SorteoConPerfil extends SorteoRow {
  perfiles: { nombre: string; apellidos: string; telefono: string | null } | null
}

interface PremioLocal {
  id: string
  sorteo_id: string
  lugar: number
  nombre: string
  descripcion: string | null
  imagen_url: string | null
  valor_estimado: number | null
  categoria: string | null
}

const FILTROS: Estatus[] = ['pendiente', 'activo', 'pausado', 'rechazado', 'finalizado', 'eliminado']

const LUGAR_LABEL: Record<number, string> = { 1: '1er Premio', 2: '2do Premio', 3: '3er Premio' }

export default function AdminSorteosPage() {
  const supabase = createClient()
  const sb = supabase as any

  const [sorteos, setSorteos]   = useState<SorteoConPerfil[]>([])
  const [filtro, setFiltro]     = useState<Estatus>('pendiente')
  const [expandido, setExpandido] = useState<string | null>(null)

  // Premios
  const [premiosPorSorteo, setPremiosPorSorteo] = useState<Record<string, PremioLocal[]>>({})
  const [categoriasDraft, setCategoriasDraft]   = useState<Record<string, string>>({})
  const [guardandoCats, setGuardandoCats]       = useState(false)

  // Publicar en Facebook al aprobar (por sorteo, default activado)
  const [publicarFacebook, setPublicarFacebook] = useState<Record<string, boolean>>({})
  const [publicandoFb, setPublicandoFb] = useState<string | null>(null)

  // Reject / action state
  const [motivoRechazo, setMotivoRechazo]     = useState('')
  const [rechazando, setRechazando]           = useState<string | null>(null)
  const [accionPendiente, setAccionPendiente] = useState<{ id: string; tipo: 'pausado' | 'eliminado' } | null>(null)
  const [motivoAccion, setMotivoAccion]       = useState('')

  const [finalizarPendiente, setFinalizarPendiente] = useState<string | null>(null)
  const [finalizando, setFinalizando]               = useState<string | null>(null)
  const [ganadoresAbierto, setGanadoresAbierto]      = useState<string | null>(null)

  const cargar = async () => {
    const { data } = await sb
      .from('sorteos')
      .select('*, perfiles(nombre, apellidos, telefono)')
      .eq('estatus', filtro)
      .order('created_at', { ascending: false })
    setSorteos(data ?? [])
  }

  useEffect(() => { cargar() }, [filtro])

  // ── Expand: lazy-load premios ─────────────────────────────────────────────
  const toggleExpand = async (sorteoId: string) => {
    if (expandido === sorteoId) { setExpandido(null); return }
    setExpandido(sorteoId)
    if (premiosPorSorteo[sorteoId]) return          // already loaded
    const { data } = await sb
      .from('premios')
      .select('*')
      .eq('sorteo_id', sorteoId)
      .order('lugar', { ascending: true })
    const premios: PremioLocal[] = data ?? []
    setPremiosPorSorteo(prev => ({ ...prev, [sorteoId]: premios }))
    const draft: Record<string, string> = {}
    premios.forEach(p => { draft[p.id] = p.categoria ?? '' })
    setCategoriasDraft(prev => ({ ...prev, ...draft }))
  }

  // ── Save categories ───────────────────────────────────────────────────────
  const guardarCategorias = async (sorteoId: string) => {
    const premios = premiosPorSorteo[sorteoId] ?? []
    setGuardandoCats(true)
    const res = await fetch('/api/admin/premios-categorias', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ premios: premios.map(p => ({ id: p.id, categoria: categoriasDraft[p.id] ?? '' })) }),
    })
    setGuardandoCats(false)
    if (!res.ok) { toast.error('Error al guardar categorías'); return }
    setPremiosPorSorteo(prev => ({
      ...prev,
      [sorteoId]: premios.map(p => ({ ...p, categoria: categoriasDraft[p.id] || null })),
    }))
    toast.success('Categorías guardadas')
  }

  // ── Approve ───────────────────────────────────────────────────────────────
  const aprobar = async (sorteo: SorteoConPerfil) => {
    const res = await fetch('/api/admin/aprobar-sorteo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sorteoId: sorteo.id,
        totalNumeros: sorteo.total_numeros,
        publicarEnFacebook: publicarFacebook[sorteo.id] ?? true,
      }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(`Error al aprobar: ${json.error ?? ''}`); return }
    toast.success(`Sorteo "${sorteo.nombre}" aprobado y ${sorteo.total_numeros} boletos generados.`)
    if (json.facebook?.ok) {
      toast.success('Publicado en la página de Facebook.')
    } else if (json.facebook && !json.facebook.ok) {
      toast.warning(`No se pudo publicar en Facebook: ${json.facebook.error ?? ''}`)
    }
    setSorteos(prev => prev.filter(s => s.id !== sorteo.id))
  }

  // ── Publicar sorteo activo en Facebook ──────────────────────────────────────
  const publicarSorteoActivo = async (sorteo: SorteoConPerfil) => {
    setPublicandoFb(sorteo.id)
    const res = await fetch('/api/admin/publicar-facebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sorteoId: sorteo.id }),
    })
    const json = await res.json()
    setPublicandoFb(null)
    if (!res.ok) { toast.error(`No se pudo publicar en Facebook: ${json.error ?? ''}`); return }
    toast.success(`Sorteo "${sorteo.nombre}" publicado en Facebook.`)
    setSorteos(prev => prev.map(s => s.id === sorteo.id ? { ...s, facebook_publicado_at: new Date().toISOString() } : s))
  }

  // ── Reject ────────────────────────────────────────────────────────────────
  const rechazar = async (id: string) => {
    if (!motivoRechazo.trim()) { toast.error('Escribe el motivo del rechazo'); return }
    const { error } = await sb.from('sorteos').update({ estatus: 'rechazado', motivo_rechazo: motivoRechazo }).eq('id', id)
    if (error) { toast.error('Error'); return }
    toast.success('Sorteo rechazado')
    setSorteos(prev => prev.filter(s => s.id !== id))
    setRechazando(null)
    setMotivoRechazo('')
  }

  const reactivar = async (id: string) => {
    const { error } = await sb.from('sorteos').update({ estatus: 'activo', motivo_rechazo: null }).eq('id', id)
    if (error) { toast.error('Error al reactivar'); return }
    toast.success('Sorteo reactivado')
    setSorteos(prev => prev.filter(s => s.id !== id))
  }

  const finalizar = async (id: string) => {
    setFinalizando(id)
    const res = await fetch(`/api/sorteos/${id}/finalizar`, { method: 'POST' })
    const json = await res.json()
    setFinalizando(null)
    if (!res.ok) { toast.error(json.error ?? 'Error al finalizar el sorteo'); return }
    toast.success('Sorteo finalizado')
    setSorteos((prev) => prev.filter((s) => s.id !== id))
    setFinalizarPendiente(null)
  }

  const confirmarAccion = async () => {
    if (!accionPendiente) return
    if (!motivoAccion.trim()) { toast.error('Escribe el motivo'); return }
    const sorteo = sorteos.find(s => s.id === accionPendiente.id)
    if (accionPendiente.tipo === 'eliminado') {
      const res = await fetch('/api/admin/eliminar-sorteo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sorteoId: accionPendiente.id, motivo: motivoAccion }),
      })
      if (!res.ok) { toast.error('Error al aplicar la acción'); return }
    } else {
      const { error } = await sb.from('sorteos').update({ estatus: accionPendiente.tipo, motivo_rechazo: motivoAccion }).eq('id', accionPendiente.id)
      if (error) { toast.error('Error al aplicar la acción'); return }
    }
    if (sorteo?.perfiles?.telefono) {
      await fetch('/api/admin/notificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono: sorteo.perfiles.telefono,
          nombre: `${sorteo.perfiles.nombre} ${sorteo.perfiles.apellidos}`,
          sorteoNombre: sorteo.nombre,
          motivo: motivoAccion,
          accion: accionPendiente.tipo,
        }),
      })
    }
    toast.success(accionPendiente.tipo === 'pausado' ? 'Sorteo pausado y organizador notificado.' : 'Sorteo eliminado y organizador notificado.')
    setSorteos(prev => prev.filter(s => s.id !== accionPendiente.id))
    setAccionPendiente(null)
    setMotivoAccion('')
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-title text-4xl text-brand-text tracking-wide">GESTIÓN DE SORTEOS</h1>
        <Link href="/admin/sorteos/nuevo">
          <Button className="gap-2"><Plus className="w-4 h-4" />Nuevo Sorteo</Button>
        </Link>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTROS.map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-ui capitalize cursor-pointer transition-colors ${
              filtro === f ? 'bg-primary text-white' : 'bg-brand-card border border-brand-border text-brand-muted hover:text-brand-text'
            }`}
          >
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
          {sorteos.map(s => (
            <div key={s.id} className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">

              {/* ── Header row ── */}
              <div className="flex items-center justify-between p-4 sm:p-5 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-ui font-semibold text-brand-text text-sm sm:text-base">{s.nombre}</h3>
                    <Badge variant={s.estatus as any}>{s.estatus}</Badge>
                    {s.facebook_publicado_at && (
                      <span
                        title={`Publicado en Facebook el ${formatDate(s.facebook_publicado_at)}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-ui font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      >
                        <Facebook className="w-2.5 h-2.5" />FB
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-brand-muted mt-1 font-body">
                    {s.perfiles?.nombre} {s.perfiles?.apellidos} · {formatDate(s.fecha_sorteo)} · {s.total_numeros} núms · {formatCurrency(s.precio_unitario)}/bol
                  </p>
                </div>

                {/* Acciones desktop */}
                <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                  {s.estatus === 'pendiente' && (
                    <>
                      <Button size="sm" onClick={() => aprobar(s)} className="gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />Aprobar
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setRechazando(rechazando === s.id ? null : s.id)} className="gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400">
                        <XCircle className="w-3.5 h-3.5" />Rechazar
                      </Button>
                    </>
                  )}
                  {s.estatus === 'pausado' && (
                    <Button size="sm" variant="secondary" onClick={() => reactivar(s.id)} className="gap-1.5 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-400">
                      <PlayCircle className="w-3.5 h-3.5" />Reactivar
                    </Button>
                  )}
                  {s.estatus === 'activo' && (
                    <Button size="sm" variant="secondary" disabled={publicandoFb === s.id} onClick={() => publicarSorteoActivo(s)} className="gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-400">
                      {publicandoFb === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Facebook className="w-3.5 h-3.5" />}
                      Publicar en Facebook
                    </Button>
                  )}
                  {s.estatus === 'activo' && (
                    <Button size="sm" variant="secondary" onClick={() => setFinalizarPendiente(s.id)} className="gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-400">
                      <Trophy className="w-3.5 h-3.5" />Finalizar
                    </Button>
                  )}
                  {s.estatus === 'finalizado' && (
                    <Button size="sm" variant="secondary" onClick={() => setGanadoresAbierto(s.id)} className="gap-1.5">
                      <Trophy className="w-3.5 h-3.5" />Gestionar ganadores
                    </Button>
                  )}
                  {s.estatus !== 'eliminado' && (
                    <>
                      <Link href={`/admin/sorteos/${s.id}/editar`}>
                        <Button size="sm" variant="secondary" className="gap-1.5">
                          <Pencil className="w-3.5 h-3.5" />Editar
                        </Button>
                      </Link>
                      {s.estatus !== 'pausado' && (
                        <Button size="sm" variant="secondary" onClick={() => { setAccionPendiente({ id: s.id, tipo: 'pausado' }); setMotivoAccion('') }} className="gap-1.5 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-400">
                          <PauseCircle className="w-3.5 h-3.5" />Pausar
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => { setAccionPendiente({ id: s.id, tipo: 'eliminado' }); setMotivoAccion('') }} className="gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />Eliminar
                      </Button>
                    </>
                  )}
                  <button onClick={() => toggleExpand(s.id)} className="p-1 text-brand-muted hover:text-brand-text transition-colors cursor-pointer">
                    {expandido === s.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Acciones móvil — dropdown + expand */}
                <div className="flex sm:hidden items-center gap-1 flex-shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="w-8 h-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {s.estatus === 'pendiente' && (
                        <>
                          <DropdownMenuItem onClick={() => aprobar(s)}>
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />Aprobar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setRechazando(rechazando === s.id ? null : s.id)}>
                            <XCircle className="w-3.5 h-3.5 text-red-400" />Rechazar
                          </DropdownMenuItem>
                        </>
                      )}
                      {s.estatus === 'pausado' && (
                        <DropdownMenuItem onClick={() => reactivar(s.id)}>
                          <PlayCircle className="w-3.5 h-3.5 text-green-400" />Reactivar
                        </DropdownMenuItem>
                      )}
                      {s.estatus === 'activo' && (
                        <DropdownMenuItem disabled={publicandoFb === s.id} onClick={() => publicarSorteoActivo(s)}>
                          {publicandoFb === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Facebook className="w-3.5 h-3.5 text-blue-400" />}
                          Publicar en Facebook
                        </DropdownMenuItem>
                      )}
                      {s.estatus === 'activo' && (
                        <DropdownMenuItem onClick={() => setFinalizarPendiente(s.id)}>
                          <Trophy className="w-3.5 h-3.5 text-blue-400" />Finalizar
                        </DropdownMenuItem>
                      )}
                      {s.estatus === 'finalizado' && (
                        <DropdownMenuItem onClick={() => setGanadoresAbierto(s.id)}>
                          <Trophy className="w-3.5 h-3.5" />Gestionar ganadores
                        </DropdownMenuItem>
                      )}
                      {s.estatus !== 'eliminado' && (
                        <>
                          {(s.estatus === 'pendiente' || s.estatus === 'pausado' || s.estatus === 'activo') && <DropdownMenuSeparator />}
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/sorteos/${s.id}/editar`} className="flex items-center gap-2">
                              <Pencil className="w-3.5 h-3.5" />Editar
                            </Link>
                          </DropdownMenuItem>
                          {s.estatus !== 'pausado' && (
                            <DropdownMenuItem onClick={() => { setAccionPendiente({ id: s.id, tipo: 'pausado' }); setMotivoAccion('') }}>
                              <PauseCircle className="w-3.5 h-3.5 text-yellow-400" />Pausar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => { setAccionPendiente({ id: s.id, tipo: 'eliminado' }); setMotivoAccion('') }}>
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />Eliminar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <button onClick={() => toggleExpand(s.id)} className="p-1 text-brand-muted hover:text-brand-text transition-colors cursor-pointer">
                    {expandido === s.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* ── Publicar en Facebook (solo pendientes) ── */}
              {s.estatus === 'pendiente' && (
                <div className="px-4 sm:px-5 pb-4 -mt-1">
                  <label className="flex items-center gap-2 text-xs text-brand-muted font-ui cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={publicarFacebook[s.id] ?? true}
                      onChange={e => setPublicarFacebook(prev => ({ ...prev, [s.id]: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded border-brand-border accent-primary cursor-pointer"
                    />
                    <Facebook className="w-3.5 h-3.5" />
                    Publicar en Facebook al aprobar
                  </label>
                </div>
              )}

              {/* ── Expanded panel ── */}
              {expandido === s.id && (
                <div className="border-t border-brand-border px-5 py-5 space-y-5">

                  {/* Description */}
                  <p className="text-sm text-brand-muted font-body">{s.descripcion ?? 'Sin descripción.'}</p>
                  {s.motivo_rechazo && (
                    <p className="text-xs text-red-400 font-body">Motivo: {s.motivo_rechazo}</p>
                  )}

                  {/* Premios */}
                  <div>
                    <p className="text-xs font-ui font-semibold text-brand-muted uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      Premios del sorteo
                    </p>

                    {!premiosPorSorteo[s.id] ? (
                      <div className="flex items-center gap-2 text-xs text-brand-muted py-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Cargando premios...
                      </div>
                    ) : premiosPorSorteo[s.id].length === 0 ? (
                      <p className="text-xs text-brand-muted py-2">Sin premios registrados.</p>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {premiosPorSorteo[s.id].map(premio => (
                            <div
                              key={premio.id}
                              className="flex items-start gap-4 p-4 rounded-xl bg-brand-bg border border-brand-border"
                            >
                              {/* Prize image */}
                              {premio.imagen_url ? (
                                <img
                                  src={premio.imagen_url}
                                  alt={premio.nombre}
                                  className="w-20 h-20 object-contain rounded-lg flex-shrink-0 bg-white p-1"
                                />
                              ) : (
                                <div className="w-20 h-20 rounded-lg flex-shrink-0 bg-brand-card border border-brand-border flex items-center justify-center">
                                  <span className="text-2xl">🏆</span>
                                </div>
                              )}

                              {/* Prize info + category */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="text-[10px] font-ui font-semibold text-brand-muted bg-brand-card border border-brand-border px-2 py-0.5 rounded-full">
                                    {LUGAR_LABEL[premio.lugar] ?? `${premio.lugar}° Premio`}
                                  </span>
                                  <span className="font-ui font-semibold text-sm text-brand-text">{premio.nombre}</span>
                                  {premio.valor_estimado && (
                                    <span className="text-xs text-primary font-semibold">
                                      {formatCurrency(premio.valor_estimado)}
                                    </span>
                                  )}
                                </div>
                                {premio.descripcion && (
                                  <p className="text-xs text-brand-muted font-body mb-3 leading-relaxed">
                                    {premio.descripcion}
                                  </p>
                                )}

                                {/* Category selector */}
                                <div className="flex items-center gap-2">
                                  <Tag className="w-3.5 h-3.5 text-brand-muted flex-shrink-0" />
                                  <select
                                    value={categoriasDraft[premio.id] ?? ''}
                                    onChange={e => setCategoriasDraft(prev => ({ ...prev, [premio.id]: e.target.value }))}
                                    disabled={s.estatus === 'eliminado'}
                                    className="border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text bg-brand-bg focus:outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <option value="" className="bg-brand-bg text-brand-text">Sin categoría</option>
                                    {CATEGORIAS.map(c => (
                                      <option key={c} value={c} className="bg-brand-bg text-brand-text">{c}</option>
                                    ))}
                                  </select>
                                  {categoriasDraft[premio.id] && (
                                    <span className="text-[10px] font-ui font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                      {categoriasDraft[premio.id]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Save categories button */}
                        {s.estatus !== 'eliminado' && (
                          <div className="flex justify-end pt-3">
                            <button
                              onClick={() => guardarCategorias(s.id)}
                              disabled={guardandoCats}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-ui font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
                            >
                              {guardandoCats && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              Guardar categorías
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── Reject form ── */}
              {rechazando === s.id && (
                <div className="border-t border-brand-border px-5 py-4 space-y-3">
                  <textarea
                    className="w-full rounded-lg border border-brand-border bg-white text-brand-text text-sm p-3 placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-none"
                    placeholder="Motivo del rechazo (visible para el organizador)..."
                    value={motivoRechazo}
                    onChange={e => setMotivoRechazo(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setRechazando(null)}>Cancelar</Button>
                    <Button size="sm" variant="destructive" onClick={() => rechazar(s.id)} className="bg-red-600 hover:bg-red-700">
                      Confirmar rechazo
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Pause / delete confirm ── */}
              {accionPendiente?.id === s.id && (
                <div className="border-t border-brand-border px-5 py-4 space-y-3">
                  <p className="text-xs text-brand-muted font-ui">
                    {accionPendiente.tipo === 'pausado'
                      ? 'El sorteo se ocultará de la página web y el organizador será notificado por WhatsApp.'
                      : 'El sorteo se eliminará de la página web y el organizador será notificado por WhatsApp.'}
                  </p>
                  <textarea
                    className="w-full rounded-lg border border-brand-border bg-white text-brand-text text-sm p-3 placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-none"
                    placeholder={`Motivo del ${accionPendiente.tipo} (se enviará al organizador)...`}
                    value={motivoAccion}
                    onChange={e => setMotivoAccion(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAccionPendiente(null)}>Cancelar</Button>
                    <Button size="sm" variant="destructive" onClick={confirmarAccion} className="bg-red-600 hover:bg-red-700">
                      Confirmar {accionPendiente.tipo === 'pausado' ? 'pausa' : 'eliminación'}
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Finalizar confirm ── */}
              {finalizarPendiente === s.id && (
                <div className="border-t border-brand-border px-5 py-4 space-y-3">
                  <p className="text-xs text-brand-muted font-ui">
                    El sorteo dejará de venderse y pasará a "Sorteos Finalizados" en la web pública. Podrás declarar los ganadores ahora o después.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setFinalizarPendiente(null)}>Cancelar</Button>
                    <Button size="sm" disabled={finalizando === s.id} onClick={() => finalizar(s.id)}>
                      {finalizando === s.id && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                      Confirmar finalización
                    </Button>
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      )}
      {ganadoresAbierto && (
        <GanadoresManager sorteoId={ganadoresAbierto} open={!!ganadoresAbierto} onClose={() => setGanadoresAbierto(null)} />
      )}
    </div>
  )
}
