'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Plus, Loader2, ImageIcon } from 'lucide-react'
import { CATEGORIAS } from '@/lib/utils'

interface ImagenPredeterminada {
  id: string
  categoria: string
  nombre: string | null
  url: string
  orden: number
  activo: boolean
}

const darkInput = 'w-full border border-white/10 rounded-xl px-3 py-2 text-sm text-white bg-[#161616] focus:outline-none focus:border-primary placeholder:text-white/30'
const card      = 'bg-brand-card border border-brand-border rounded-2xl p-6'

export default function AdminPortadasPage() {
  const [imagenes, setImagenes]               = useState<ImagenPredeterminada[]>([])
  const [categoriaForm, setCategoriaForm]     = useState<string>(CATEGORIAS[0])
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas')
  const [nuevoNombre, setNuevoNombre]         = useState('')
  const [uploading, setUploading]             = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadImagenes = async () => {
    const res  = await fetch('/api/admin/imagenes-predeterminadas')
    const data = await res.json()
    setImagenes(Array.isArray(data) ? data : [])
  }

  useEffect(() => { loadImagenes() }, [])

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) { toast.error('Selecciona una imagen'); return }
    setUploading(true)
    const ordenActual = imagenes.filter(i => i.categoria === categoriaForm).length
    const form = new FormData()
    form.append('file', file)
    form.append('categoria', categoriaForm)
    form.append('nombre', nuevoNombre)
    form.append('orden', String(ordenActual))
    const res  = await fetch('/api/admin/imagenes-predeterminadas', { method: 'POST', body: form })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error ?? 'Error al subir'); setUploading(false); return }
    toast.success('Imagen agregada')
    setNuevoNombre('')
    if (fileRef.current) fileRef.current.value = ''
    setUploading(false)
    loadImagenes()
  }

  const toggleActivo = async (img: ImagenPredeterminada) => {
    const res = await fetch('/api/admin/imagenes-predeterminadas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: img.id, activo: !img.activo }),
    })
    if (!res.ok) { toast.error('Error al actualizar'); return }
    setImagenes(prev => prev.map(i => i.id === img.id ? { ...i, activo: !i.activo } : i))
  }

  const deleteImagen = async (id: string) => {
    if (!confirm('¿Eliminar esta imagen?')) return
    const res = await fetch('/api/admin/imagenes-predeterminadas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) { toast.error('Error al eliminar'); return }
    toast.success('Imagen eliminada')
    setImagenes(prev => prev.filter(i => i.id !== id))
  }

  const moveImagen = async (categoria: string, idx: number, dir: 'up' | 'down') => {
    const items = imagenes.filter(i => i.categoria === categoria).sort((a, b) => a.orden - b.orden)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= items.length) return
    ;[items[idx], items[swapIdx]] = [items[swapIdx], items[idx]]
    const updated = items.map((it, i) => ({ ...it, orden: i }))
    setImagenes(prev => prev.map(i => updated.find(u => u.id === i.id) ?? i))
    await Promise.all(updated.map(it =>
      fetch('/api/admin/imagenes-predeterminadas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: it.id, orden: it.orden }),
      })
    ))
  }

  const imagenesFiltradas = categoriaFiltro === 'todas'
    ? imagenes
    : imagenes.filter(i => i.categoria === categoriaFiltro)

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="font-title text-3xl text-brand-text tracking-wide">PORTADAS PREDETERMINADAS</h1>
        <p className="text-brand-muted text-sm font-body mt-1">
          Galería de imágenes que los socios pueden elegir como portada de sus premios, organizadas por categoría.
        </p>
      </div>

      {/* Upload */}
      <div className={card}>
        <h2 className="font-ui font-semibold text-brand-text text-lg mb-1 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          Agregar imagen
        </h2>
        <div className="flex gap-3 items-end mb-2 flex-wrap mt-4">
          <div>
            <label className="text-xs font-ui font-semibold text-brand-muted mb-1 block">Categoría</label>
            <select value={categoriaForm} onChange={e => setCategoriaForm(e.target.value)} className={darkInput}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-ui font-semibold text-brand-muted mb-1 block">Nombre (opcional)</label>
            <input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Ej: Camioneta roja" className={darkInput} />
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
            Agregar
          </button>
        </div>
      </div>

      {/* Filtro + lista */}
      <div className={card}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-ui font-semibold text-brand-text text-lg">Imágenes ({imagenesFiltradas.length})</h2>
          <select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)} className={darkInput} style={{ width: 'auto' }}>
            <option value="todas">Todas las categorías</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {imagenesFiltradas.length === 0 ? (
          <div className="text-center py-10 text-brand-muted text-sm border-2 border-dashed border-brand-border rounded-xl">
            Sin imágenes en esta categoría todavía.
          </div>
        ) : (
          <div className="space-y-3">
            {imagenesFiltradas.map((img, idx) => (
              <div key={img.id} className="flex items-center gap-3 border border-brand-border rounded-xl p-3" style={{ opacity: img.activo ? 1 : 0.5 }}>
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-brand-card flex-shrink-0 relative">
                  <Image src={img.url} alt={img.nombre ?? 'imagen'} fill style={{ objectFit: 'cover' }} unoptimized />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-ui truncate">{img.nombre || '(sin nombre)'}</p>
                  <p className="text-xs text-brand-muted font-ui">{img.categoria}</p>
                </div>
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button onClick={() => moveImagen(img.categoria, idx, 'up')} className="p-1 rounded hover:bg-brand-border/30 transition-colors">
                    <ChevronUp className="w-3.5 h-3.5 text-brand-muted" />
                  </button>
                  <button onClick={() => moveImagen(img.categoria, idx, 'down')} className="p-1 rounded hover:bg-brand-border/30 transition-colors">
                    <ChevronDown className="w-3.5 h-3.5 text-brand-muted" />
                  </button>
                </div>
                <button onClick={() => toggleActivo(img)} className={`p-2 rounded-lg transition-colors flex-shrink-0 ${img.activo ? 'text-primary hover:bg-primary/10' : 'text-brand-muted hover:bg-brand-border/30'}`}>
                  {img.activo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => deleteImagen(img.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note */}
      <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24' }}>
        <strong>Nota:</strong> Esta galería requiere un bucket llamado{' '}
        <code className="font-mono px-1 rounded" style={{ background: 'rgba(245,158,11,0.15)' }}>portadas-predeterminadas</code>{' '}
        en Supabase Storage con acceso público habilitado. Créalo desde el dashboard de Supabase si aún no existe.
      </div>
    </div>
  )
}
