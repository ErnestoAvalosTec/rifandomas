'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Upload, X, CheckCircle2 } from 'lucide-react'

const LUGAR_LABEL: Record<number, string> = { 1: '1er Premio', 2: '2do Premio', 3: '3er Premio' }
const MAX_EVIDENCIAS = 6

interface PremioLocal {
  id: string
  lugar: number
  nombre: string
}

interface GanadorLocal {
  premio_id: string
  numero_ganador: string
  evidencia_urls: string[]
  link_externo: string | null
}

interface GanadorDraft {
  numeroGanador: string
  evidenciaUrls: string[]
  linkExterno: string
}

export function GanadoresManager({ sorteoId, open, onClose }: { sorteoId: string; open: boolean; onClose: () => void }) {
  const supabase = createClient()
  const [cargando, setCargando] = useState(true)
  const [premios, setPremios] = useState<PremioLocal[]>([])
  const [drafts, setDrafts] = useState<Record<string, GanadorDraft>>({})
  const [guardadoIds, setGuardadoIds] = useState<Set<string>>(new Set())
  const [subiendo, setSubiendo] = useState<Record<string, boolean>>({})
  const [guardando, setGuardando] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!open) return

    const cargar = async () => {
      setCargando(true)
      const [{ data: premiosData }, resGanadores] = await Promise.all([
        (supabase as any).from('premios').select('id, lugar, nombre').eq('sorteo_id', sorteoId).order('lugar', { ascending: true }),
        fetch(`/api/sorteos/${sorteoId}/ganadores`),
      ])
      const ganadoresData: GanadorLocal[] = resGanadores.ok ? await resGanadores.json() : []

      const draftsIniciales: Record<string, GanadorDraft> = {}
      const guardados = new Set<string>()
      ;(premiosData ?? []).forEach((p: PremioLocal) => {
        const existente = ganadoresData.find((g) => g.premio_id === p.id)
        draftsIniciales[p.id] = {
          numeroGanador: existente?.numero_ganador ?? '',
          evidenciaUrls: existente?.evidencia_urls ?? [],
          linkExterno: existente?.link_externo ?? '',
        }
        if (existente) guardados.add(p.id)
      })

      setPremios(premiosData ?? [])
      setDrafts(draftsIniciales)
      setGuardadoIds(guardados)
      setCargando(false)
    }

    cargar()
  }, [open, sorteoId])

  const subirEvidencia = async (premioId: string, files: FileList) => {
    const actual = drafts[premioId]?.evidenciaUrls ?? []
    const disponibles = MAX_EVIDENCIAS - actual.length
    if (disponibles <= 0) { toast.error(`Máximo ${MAX_EVIDENCIAS} imágenes de evidencia`); return }

    setSubiendo((prev) => ({ ...prev, [premioId]: true }))
    const nuevasUrls: string[] = []
    for (const file of Array.from(files).slice(0, disponibles)) {
      const ext = file.name.split('.').pop()
      const path = `${sorteoId}/${premioId}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
      const { data, error } = await supabase.storage.from('evidencias-sorteo').upload(path, file, { upsert: true })
      if (error) { toast.error(`Error al subir ${file.name}`); continue }
      const { data: { publicUrl } } = supabase.storage.from('evidencias-sorteo').getPublicUrl(data.path)
      nuevasUrls.push(publicUrl)
    }

    if (nuevasUrls.length) {
      setDrafts((prev) => ({
        ...prev,
        [premioId]: { ...prev[premioId], evidenciaUrls: [...(prev[premioId]?.evidenciaUrls ?? []), ...nuevasUrls] },
      }))
    }
    setSubiendo((prev) => ({ ...prev, [premioId]: false }))
  }

  const quitarEvidencia = (premioId: string, url: string) => {
    setDrafts((prev) => ({
      ...prev,
      [premioId]: { ...prev[premioId], evidenciaUrls: prev[premioId].evidenciaUrls.filter((u) => u !== url) },
    }))
  }

  const guardarGanador = async (premioId: string) => {
    const draft = drafts[premioId]
    if (!draft?.numeroGanador.trim()) { toast.error('Ingresa el número de boleto ganador'); return }
    if (!draft.evidenciaUrls.length) { toast.error('Sube al menos una imagen de evidencia'); return }

    setGuardando((prev) => ({ ...prev, [premioId]: true }))
    const res = await fetch(`/api/sorteos/${sorteoId}/ganadores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        premioId,
        numeroGanador: draft.numeroGanador.trim(),
        evidenciaUrls: draft.evidenciaUrls,
        linkExterno: draft.linkExterno.trim(),
      }),
    })
    const json = await res.json()
    setGuardando((prev) => ({ ...prev, [premioId]: false }))
    if (!res.ok) { toast.error(json.error ?? 'Error al guardar el ganador'); return }
    setGuardadoIds((prev) => new Set(prev).add(premioId))
    toast.success('Ganador guardado')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar ganadores</DialogTitle>
        </DialogHeader>

        {cargando ? (
          <div className="flex items-center gap-2 text-sm text-brand-muted py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />Cargando premios...
          </div>
        ) : (
          <div className="space-y-5">
            {premios.map((premio) => {
              const draft = drafts[premio.id] ?? { numeroGanador: '', evidenciaUrls: [] }
              const declarado = guardadoIds.has(premio.id)
              return (
                <div key={premio.id} className="rounded-xl border border-brand-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-ui font-semibold text-sm text-brand-text">
                      {LUGAR_LABEL[premio.lugar] ?? `${premio.lugar}° Premio`} — {premio.nombre}
                    </p>
                    {declarado ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-ui font-semibold text-green-400">
                        <CheckCircle2 className="w-3 h-3" />Declarado
                      </span>
                    ) : (
                      <span className="text-[10px] font-ui font-semibold text-brand-muted">Pendiente</span>
                    )}
                  </div>

                  <Input
                    placeholder="Número de boleto ganador (ej. 0042)"
                    value={draft.numeroGanador}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [premio.id]: { ...prev[premio.id], numeroGanador: e.target.value } }))
                    }
                  />

                  <Input
                    placeholder="Link externo (opcional) — YouTube, Facebook, etc."
                    value={draft.linkExterno}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [premio.id]: { ...prev[premio.id], linkExterno: e.target.value } }))
                    }
                  />

                  <div className="flex flex-wrap gap-2">
                    {draft.evidenciaUrls.map((url) => (
                      <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-brand-border">
                        <img src={url} alt="Evidencia" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => quitarEvidencia(premio.id, url)}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center"
                        >
                          <X className="w-2.5 h-2.5 text-white" />
                        </button>
                      </div>
                    ))}
                    <label className="w-16 h-16 rounded-lg border border-dashed border-brand-border flex items-center justify-center cursor-pointer text-brand-muted hover:text-brand-text">
                      {subiendo[premio.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => e.target.files && subirEvidencia(premio.id, e.target.files)}
                      />
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <Button size="sm" disabled={guardando[premio.id]} onClick={() => guardarGanador(premio.id)}>
                      {guardando[premio.id] && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                      {declarado ? 'Actualizar ganador' : 'Guardar ganador'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
