'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Plus, Star, Loader2, ImageIcon, Info, Upload } from 'lucide-react'

interface Slide {
  id: string
  imagen_url: string
  titulo: string | null
  orden: number
  activo: boolean
}

interface SorteoSimple {
  id: string
  nombre: string
  destacado: boolean
}

const darkInput = 'w-full border border-white/10 rounded-xl px-3 py-2 text-sm text-white bg-[#161616] focus:outline-none focus:border-primary placeholder:text-white/30'
const card      = 'bg-brand-card border border-brand-border rounded-2xl p-6'

export default function AdminHeroPage() {
  const supabase = createClient()
  const sb = supabase as any

  const [slides, setSlides]                   = useState<Slide[]>([])
  const [sorteos, setSorteos]                 = useState<SorteoSimple[]>([])
  const [destacadoId, setDestacadoId]         = useState<string>('')
  const [savingDestacado, setSavingDestacado] = useState(false)
  const [uploading, setUploading]             = useState(false)
  const [nuevoTitulo, setNuevoTitulo]         = useState('')
  const [ctaBannerUrl, setCtaBannerUrl]       = useState<string | null>(null)
  const [uploadingCta, setUploadingCta]       = useState(false)
  const fileRef    = useRef<HTMLInputElement>(null)
  const ctaFileRef = useRef<HTMLInputElement>(null)

  const loadSlides = async () => {
    const res  = await fetch('/api/admin/hero-slides')
    const data = await res.json()
    setSlides(Array.isArray(data) ? data : [])
  }

  const loadSorteos = async () => {
    const { data } = await sb
      .from('sorteos')
      .select('id, nombre, destacado')
      .eq('estatus', 'activo')
      .order('created_at', { ascending: false })
    const list = (data ?? []) as SorteoSimple[]
    setSorteos(list)
    const found = list.find((s: SorteoSimple) => s.destacado)
    if (found) setDestacadoId(found.id)
  }

  const loadCtaBanner = async () => {
    const res  = await fetch('/api/admin/marca-get')
    const data = await res.json()
    setCtaBannerUrl(data.cta_banner_url ?? null)
  }

  const handleCtaUpload = async () => {
    const file = ctaFileRef.current?.files?.[0]
    if (!file) { toast.error('Selecciona una imagen'); return }
    setUploadingCta(true)
    const form = new FormData()
    form.append('file', file)
    form.append('tipo', 'cta_banner')
    const res  = await fetch('/api/admin/marca', { method: 'POST', body: form })
    const json = await res.json()
    setUploadingCta(false)
    if (!res.ok) { toast.error(json.error ?? 'Error al subir'); return }
    setCtaBannerUrl(json.url)
    if (ctaFileRef.current) ctaFileRef.current.value = ''
    toast.success('Banner CTA actualizado')
  }

  const handleCtaDelete = async () => {
    if (!confirm('¿Eliminar el banner CTA?')) return
    const res = await fetch('/api/admin/marca', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'cta_banner' }),
    })
    if (!res.ok) { toast.error('Error al eliminar'); return }
    setCtaBannerUrl(null)
    toast.success('Banner CTA eliminado')
  }

  useEffect(() => { loadSlides(); loadSorteos(); loadCtaBanner() }, [])

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) { toast.error('Selecciona una imagen'); return }
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('titulo', nuevoTitulo)
    form.append('orden', String(slides.length))
    const res  = await fetch('/api/admin/hero-slides', { method: 'POST', body: form })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al subir'); setUploading(false); return }
    toast.success('Slide agregado')
    setNuevoTitulo('')
    if (fileRef.current) fileRef.current.value = ''
    setUploading(false)
    loadSlides()
  }

  const toggleActivo = async (slide: Slide) => {
    const res = await fetch('/api/admin/hero-slides', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: slide.id, activo: !slide.activo }),
    })
    if (!res.ok) { toast.error('Error al actualizar'); return }
    setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, activo: !s.activo } : s))
  }

  const updateTitulo = async (slide: Slide, titulo: string) => {
    await fetch('/api/admin/hero-slides', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: slide.id, titulo }),
    })
    setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, titulo } : s))
  }

  const moveSlide = async (idx: number, dir: 'up' | 'down') => {
    const newSlides = [...slides]
    const swapIdx   = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= newSlides.length) return
    ;[newSlides[idx], newSlides[swapIdx]] = [newSlides[swapIdx], newSlides[idx]]
    const updated = newSlides.map((s, i) => ({ ...s, orden: i }))
    setSlides(updated)
    await Promise.all(updated.map(s =>
      fetch('/api/admin/hero-slides', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, orden: s.orden }),
      })
    ))
  }

  const deleteSlide = async (id: string) => {
    if (!confirm('¿Eliminar este slide?')) return
    const res = await fetch('/api/admin/hero-slides', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) { toast.error('Error al eliminar'); return }
    toast.success('Slide eliminado')
    setSlides(prev => prev.filter(s => s.id !== id))
  }

  const saveDestacado = async () => {
    setSavingDestacado(true)
    const res = await fetch('/api/admin/sorteo-destacado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sorteoId: destacadoId || null }),
    })
    if (!res.ok) { toast.error('Error al guardar'); setSavingDestacado(false); return }
    toast.success('Sorteo destacado actualizado')
    setSavingDestacado(false)
    loadSorteos()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="font-title text-3xl text-brand-text tracking-wide">HERO DE INICIO</h1>
        <p className="text-brand-muted text-sm font-body mt-1">
          Administra el slider de banners y el sorteo destacado que aparecen en la portada.
        </p>
      </div>

      {/* ── Slider ── */}
      <div className={card}>
        <h2 className="font-ui font-semibold text-brand-text text-lg mb-1 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          Slider de imágenes
        </h2>
        <p className="text-brand-muted text-xs font-body mb-5">
          Las imágenes se muestran en el orden indicado. Activa o desactiva slides sin eliminarlos.
        </p>

        {/* Upload */}
        <div className="flex gap-3 items-end mb-6 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-ui font-semibold text-brand-muted mb-1 block">Título (opcional)</label>
            <input
              value={nuevoTitulo}
              onChange={e => setNuevoTitulo(e.target.value)}
              placeholder="Ej: ¡Gana un auto este fin de semana!"
              className={darkInput}
            />
          </div>
          <div>
            <label className="text-xs font-ui font-semibold text-brand-muted mb-1 block">Imagen</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="text-sm text-brand-muted file:mr-2 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:text-xs file:font-semibold file:px-3 file:py-1.5 file:cursor-pointer"
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-ui font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Agregar slide
          </button>
        </div>

        {/* List */}
        {slides.length === 0 ? (
          <div className="text-center py-10 text-brand-muted text-sm border-2 border-dashed border-brand-border rounded-xl">
            Sin slides todavía. Sube la primera imagen para comenzar.
          </div>
        ) : (
          <div className="space-y-3">
            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                className="flex items-center gap-3 border border-brand-border rounded-xl p-3"
                style={{ opacity: slide.activo ? 1 : 0.5 }}
              >
                <div className="w-24 h-16 rounded-lg overflow-hidden bg-brand-card flex-shrink-0 relative">
                  <Image src={slide.imagen_url} alt={slide.titulo ?? 'slide'} fill style={{ objectFit: 'cover' }} />
                </div>

                <input
                  defaultValue={slide.titulo ?? ''}
                  onBlur={e => updateTitulo(slide, e.target.value)}
                  placeholder="Título (opcional)"
                  className="flex-1 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white bg-[#161616] focus:outline-none focus:border-primary placeholder:text-white/30 min-w-0"
                />

                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button onClick={() => moveSlide(idx, 'up')} disabled={idx === 0}
                    className="p-1 rounded hover:bg-brand-border/30 disabled:opacity-30 transition-colors">
                    <ChevronUp className="w-3.5 h-3.5 text-brand-muted" />
                  </button>
                  <button onClick={() => moveSlide(idx, 'down')} disabled={idx === slides.length - 1}
                    className="p-1 rounded hover:bg-brand-border/30 disabled:opacity-30 transition-colors">
                    <ChevronDown className="w-3.5 h-3.5 text-brand-muted" />
                  </button>
                </div>

                <button
                  onClick={() => toggleActivo(slide)}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${slide.activo ? 'text-primary hover:bg-primary/10' : 'text-brand-muted hover:bg-brand-border/30'}`}
                  title={slide.activo ? 'Desactivar' : 'Activar'}
                >
                  {slide.activo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => deleteSlide(slide.id)}
                  className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CTA Banner ── */}
      <div className={card}>
        <h2 className="font-ui font-semibold text-brand-text text-lg mb-1 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          Banner CTA (debajo del hero)
        </h2>
        <p className="text-brand-muted text-xs font-body mb-4">
          Imagen que reemplaza la franja de confianza debajo del slider. Se muestra a ancho completo.
        </p>

        {/* Spec hint */}
        <div className="rounded-xl p-3 flex gap-2 mb-5" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#60a5fa' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#93c5fd' }}>
              Resolución recomendada: 1200 × 120 px
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#7dd3fc' }}>
              Proporción 10:1 — banner horizontal muy ancho · PNG, JPG o WebP · Máx 2 MB
            </p>
          </div>
        </div>

        {/* Preview */}
        {ctaBannerUrl && (
          <div className="relative w-full rounded-xl overflow-hidden border border-brand-border mb-4" style={{ height: 80 }}>
            <Image src={ctaBannerUrl} alt="Banner CTA" fill style={{ objectFit: 'cover' }} unoptimized />
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="text-xs font-ui font-semibold text-brand-muted mb-1 block">Imagen</label>
            <input
              ref={ctaFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="text-sm text-brand-muted file:mr-2 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:text-xs file:font-semibold file:px-3 file:py-1.5 file:cursor-pointer"
            />
          </div>
          <button
            onClick={handleCtaUpload}
            disabled={uploadingCta}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-ui font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {uploadingCta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {ctaBannerUrl ? 'Reemplazar' : 'Subir banner'}
          </button>
          {ctaBannerUrl && (
            <button
              onClick={handleCtaDelete}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 text-sm font-ui font-semibold hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
          )}
        </div>
      </div>

      {/* ── Destacado ── */}
      <div className={card}>
        <h2 className="font-ui font-semibold text-brand-text text-lg mb-1 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400" />
          Sorteo destacado de la semana
        </h2>
        <p className="text-brand-muted text-xs font-body mb-5">
          El sorteo elegido aparece en el panel derecho del hero. Solo uno puede estar activo a la vez.
        </p>

        {sorteos.length === 0 ? (
          <p className="text-brand-muted text-sm py-4">No hay sorteos activos en este momento.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-brand-border rounded-xl cursor-pointer hover:border-primary/40 transition-colors">
                <input type="radio" name="destacado" value="" checked={destacadoId === ''} onChange={() => setDestacadoId('')} className="accent-primary" />
                <span className="text-sm text-brand-muted font-ui">Sin sorteo destacado</span>
              </label>
              {sorteos.map(s => (
                <label key={s.id} className="flex items-center gap-3 p-3 border border-brand-border rounded-xl cursor-pointer hover:border-primary/40 transition-colors">
                  <input type="radio" name="destacado" value={s.id} checked={destacadoId === s.id} onChange={() => setDestacadoId(s.id)} className="accent-primary" />
                  <span className="text-sm text-brand-text font-ui">{s.nombre}</span>
                  {s.destacado && (
                    <span className="ml-auto text-[10px] font-semibold bg-yellow-400/15 text-yellow-400 border border-yellow-400/30 px-2 py-0.5 rounded-full">Actual</span>
                  )}
                </label>
              ))}
            </div>
            <button
              onClick={saveDestacado}
              disabled={savingDestacado}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-ui font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {savingDestacado ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
              Guardar destacado
            </button>
          </div>
        )}
      </div>

      {/* Note */}
      <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24' }}>
        <strong>Nota:</strong> El slider requiere un bucket llamado{' '}
        <code className="font-mono px-1 rounded" style={{ background: 'rgba(245,158,11,0.15)' }}>hero-slides</code>{' '}
        en Supabase Storage con acceso público habilitado. Créalo desde el dashboard de Supabase si aún no existe.
      </div>
    </div>
  )
}
