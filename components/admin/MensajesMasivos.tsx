'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Users, Send, Loader2, RefreshCw, Square } from 'lucide-react'

interface Sorteo {
  id: string
  nombre: string
}

interface Campana {
  id: string
  sorteo_id: string
  mensaje: string
  total_destinatarios: number
  enviados: number
  fallidos: number
  estatus: 'enviando' | 'completado' | 'error' | 'pausado'
  created_at: string
  completed_at: string | null
  sorteos: { nombre: string } | null
}

// Estado mínimo de la barra de progreso — separado de Campana porque
// GET /api/admin/whatsapp/masivo/[id] no devuelve todos los campos de Campana
// (falta mensaje/sorteo_id/sorteos), y mezclar ambos tipos con un merge
// condicionado a "si ya había progreso previo" rompe el caso de reanudar una
// campaña del historial en una pestaña recién cargada (progreso empieza null).
interface Progreso {
  id: string
  total_destinatarios: number
  enviados: number
  fallidos: number
  estatus: 'enviando' | 'completado' | 'error' | 'pausado'
}

const ESTATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'cancelado', label: 'Cancelado' },
]

const BTN =
  'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-ui font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed'
const BTN_PRIMARY = `${BTN} bg-primary text-white hover:bg-primary/90`
const BTN_OUTLINE = `${BTN} border border-brand-border text-brand-text hover:bg-brand-card`
const BTN_DANGER = `${BTN} bg-red-600 text-white hover:bg-red-700`
const INPUT =
  'w-full border border-brand-border rounded-xl px-3 py-2 text-sm text-white bg-[#161616] focus:outline-none focus:border-primary placeholder:text-white/30 font-body'

export function MensajesMasivos() {
  const [sorteos, setSorteos] = useState<Sorteo[]>([])
  const [sorteoId, setSorteoId] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState<string[]>(['pendiente', 'pagado'])
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [progreso, setProgreso] = useState<Progreso | null>(null)
  const [historial, setHistorial] = useState<Campana[]>([])
  // Campaña cuyo POST /reanudar está en vuelo — deshabilita ese botón
  // puntual para que un doble clic no dispare procesarCampana() dos veces
  // en paralelo para la misma campaña (ver revisión de Task 7).
  const [reanudando, setReanudando] = useState<string | null>(null)
  // POST /detener está en vuelo — evita doble clic mientras responde
  const [deteniendo, setDeteniendo] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const cargarSorteos = async () => {
      const supabase = createClient()
      const { data } = await (supabase as any)
        .from('sorteos')
        .select('id, nombre')
        .order('created_at', { ascending: false })
      setSorteos(data ?? [])
    }
    cargarSorteos()
    cargarHistorial()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const cargarHistorial = async () => {
    const res = await fetch('/api/admin/whatsapp/masivo')
    const data = await res.json()
    setHistorial(Array.isArray(data) ? data : [])
  }

  const iniciarPolling = (id: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/admin/whatsapp/masivo/${id}`)
      if (!res.ok) return
      const data = await res.json()
      setProgreso(data)
      if (data.estatus !== 'enviando') {
        if (pollRef.current) clearInterval(pollRef.current)
        cargarHistorial()
      }
    }, 2500)
  }

  const toggleEstatus = (value: string) => {
    setFiltroEstatus((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const enviar = async () => {
    if (!sorteoId) { toast.error('Selecciona un sorteo'); return }
    if (!mensaje.trim()) { toast.error('Escribe un mensaje'); return }
    if (!filtroEstatus.length) { toast.error('Selecciona al menos un estatus'); return }

    setEnviando(true)
    try {
      const res = await fetch('/api/admin/whatsapp/masivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sorteoId, mensaje: mensaje.trim(), filtroEstatus }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'No se pudo iniciar el envío')
        return
      }
      setProgreso({
        id: data.campanaId,
        total_destinatarios: data.totalDestinatarios,
        enviados: 0,
        fallidos: 0,
        estatus: 'enviando',
      })
      iniciarPolling(data.campanaId)
      toast.success(`Enviando a ${data.totalDestinatarios} destinatarios...`)
      setMensaje('')
    } catch {
      toast.error('Error al iniciar el envío')
    } finally {
      setEnviando(false)
    }
  }

  const reanudar = async (id: string) => {
    if (reanudando === id) return
    setReanudando(id)
    try {
      await fetch(`/api/admin/whatsapp/masivo/${id}/reanudar`, { method: 'POST' })
      iniciarPolling(id)
      toast('Reanudando envío...')
    } finally {
      setReanudando(null)
    }
  }

  const detener = async () => {
    if (!progreso) return
    setDeteniendo(true)
    try {
      await fetch(`/api/admin/whatsapp/masivo/${progreso.id}/detener`, { method: 'POST' })
      toast('Envío detenido')
    } finally {
      setDeteniendo(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-ui font-semibold text-brand-text text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Mensajes masivos
        </h2>
        <p className="text-brand-muted text-xs font-body mt-1">
          Envía un mensaje a todos los concursantes de un sorteo (un solo mensaje por teléfono, aunque tengan varios pedidos).
        </p>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-xs font-ui font-semibold text-brand-muted mb-1.5 block">Sorteo</label>
          <select value={sorteoId} onChange={(e) => setSorteoId(e.target.value)} className={INPUT}>
            <option value="">Selecciona un sorteo...</option>
            {sorteos.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-ui font-semibold text-brand-muted mb-1.5 block">
            Enviar a pedidos con estatus
          </label>
          <div className="flex gap-4">
            {ESTATUS_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 text-sm text-brand-text font-body cursor-pointer">
                <input
                  type="checkbox"
                  checked={filtroEstatus.includes(opt.value)}
                  onChange={() => toggleEstatus(opt.value)}
                  className="accent-primary"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-ui font-semibold text-brand-muted mb-1.5 block">Mensaje</label>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Hola {nombre}, te informamos que..."
            rows={4}
            className={`${INPUT} resize-none`}
          />
          <p className="text-xs text-brand-muted/60 font-body mt-1">
            Usa <code>{'{nombre}'}</code> para que cada quien reciba su nombre.
          </p>
        </div>

        <div className="flex justify-end">
          {progreso?.estatus === 'enviando' ? (
            <button onClick={detener} disabled={deteniendo} className={BTN_DANGER}>
              {deteniendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
              Detener envío
            </button>
          ) : (
            <button onClick={enviar} disabled={enviando} className={BTN_PRIMARY}>
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar a todos
            </button>
          )}
        </div>

        {progreso && (
          <div className="pt-2 border-t border-brand-border space-y-2">
            <div className="flex items-center justify-between text-xs font-ui text-brand-muted gap-2">
              <span>
                {progreso.estatus === 'enviando'
                  ? `Enviando ${progreso.enviados + progreso.fallidos}/${progreso.total_destinatarios}...`
                  : progreso.estatus === 'pausado'
                  ? `Pausado: ${progreso.enviados} enviados, ${progreso.fallidos} fallidos de ${progreso.total_destinatarios}`
                  : `Completado: ${progreso.enviados} enviados, ${progreso.fallidos} fallidos de ${progreso.total_destinatarios}`}
              </span>
              {progreso.estatus === 'pausado' && (
                <button
                  onClick={() => reanudar(progreso.id)}
                  disabled={reanudando === progreso.id}
                  className={`${BTN_OUTLINE} flex-shrink-0`}
                >
                  {reanudando === progreso.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <RefreshCw className="w-3.5 h-3.5" />}
                  Reanudar
                </button>
              )}
            </div>
            <div className="w-full h-2 bg-[#161616] rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${progreso.total_destinatarios ? ((progreso.enviados + progreso.fallidos) / progreso.total_destinatarios) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {historial.length > 0 && (
        <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-brand-border">
            <h3 className="font-ui font-semibold text-brand-text text-sm">Historial de campañas</h3>
          </div>
          <div className="divide-y divide-brand-border">
            {historial.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-brand-text font-ui truncate">{c.sorteos?.nombre ?? 'Sorteo'}</p>
                  <p className="text-xs text-brand-muted font-body truncate">{c.mensaje}</p>
                  <p className="text-xs text-brand-muted/60 font-body mt-0.5">
                    {new Date(c.created_at).toLocaleString('es-MX')} · {c.enviados} enviados, {c.fallidos} fallidos de {c.total_destinatarios}
                  </p>
                </div>
                {(c.estatus === 'enviando' || c.estatus === 'pausado') ? (
                  <button
                    onClick={() => reanudar(c.id)}
                    disabled={reanudando === c.id}
                    className={`${BTN_OUTLINE} flex-shrink-0`}
                  >
                    {reanudando === c.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <RefreshCw className="w-3.5 h-3.5" />}
                    Reanudar
                  </button>
                ) : (
                  <span className="text-xs text-brand-muted flex-shrink-0">{c.estatus}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
