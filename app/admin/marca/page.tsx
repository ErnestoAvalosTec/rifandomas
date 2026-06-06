'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  Upload, Trash2, Loader2, ImageIcon, Info,
  Plus, X, MapPin, Phone, Mail, BarChart2,
} from 'lucide-react'

interface RedSocial { red: string; url: string }

interface Marca {
  logo_url: string | null
  favicon_url: string | null
  topbar_activo:     boolean
  topbar_ubicacion:  string | null
  topbar_telefono:   string | null
  topbar_correo:     string | null
  topbar_redes:      RedSocial[]
  topbar_bg_color:   string
  topbar_text_color: string
  topbar_icon_color: string
}

const REDES_OPCIONES = [
  { value: 'facebook',  label: 'Facebook'    },
  { value: 'instagram', label: 'Instagram'   },
  { value: 'tiktok',    label: 'TikTok'      },
  { value: 'whatsapp',  label: 'WhatsApp'    },
  { value: 'twitter',   label: 'Twitter / X' },
  { value: 'youtube',   label: 'YouTube'     },
  { value: 'linkedin',  label: 'LinkedIn'    },
]

const SPECS = {
  logo: {
    title: 'Logo del sitio',
    description: 'Aparece en la barra de navegación y en el panel de administración.',
    recomendacion: 'Tamaño recomendado: 300 × 80 px — PNG con fondo transparente.',
    detalle: 'Máximo 2 MB · Formatos: PNG, SVG, WebP · Relación de aspecto horizontal',
    accept: 'image/png,image/svg+xml,image/webp',
    previewW: 220, previewH: 60,
  },
  favicon: {
    title: 'Favicon',
    description: 'Ícono que aparece en la pestaña del navegador.',
    recomendacion: 'Tamaño recomendado: 64 × 64 px (cuadrado).',
    detalle: 'Máximo 512 KB · Formatos: ICO, PNG · Debe ser cuadrado',
    accept: 'image/x-icon,image/png,image/vnd.microsoft.icon',
    previewW: 64, previewH: 64,
  },
}

const darkInput  = 'w-full border border-white/10 rounded-xl px-3 py-2 text-sm text-white bg-[#161616] focus:outline-none focus:border-primary placeholder:text-white/30'
const card       = 'bg-brand-card border border-brand-border rounded-2xl p-6'

function AssetSection({
  tipo, currentUrl, onUploaded, onDeleted,
}: { tipo: 'logo' | 'favicon'; currentUrl: string | null; onUploaded: (url: string) => void; onDeleted: () => void }) {
  const spec    = SPECS[tipo]
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const [preview,   setPreview]   = useState<string | null>(currentUrl)

  useEffect(() => { setPreview(currentUrl) }, [currentUrl])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('tipo', tipo)
    const res  = await fetch('/api/admin/marca', { method: 'POST', body: form })
    const json = await res.json()
    setUploading(false)
    if (!res.ok) { toast.error(json.error ?? 'Error al subir'); setPreview(currentUrl); return }
    toast.success(`${spec.title} actualizado`)
    onUploaded(json.url)
  }

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar el ${spec.title.toLowerCase()} actual?`)) return
    setDeleting(true)
    const res = await fetch('/api/admin/marca', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo }),
    })
    setDeleting(false)
    if (!res.ok) { toast.error('Error al eliminar'); return }
    setPreview(null); onDeleted()
    toast.success(`${spec.title} eliminado`)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className={card}>
      <h2 className="font-ui font-semibold text-brand-text text-lg flex items-center gap-2 mb-1">
        <ImageIcon className="w-5 h-5 text-primary" />
        {spec.title}
      </h2>
      <p className="text-brand-muted text-sm mb-5">{spec.description}</p>

      <div className="flex items-center gap-6 mb-5 flex-wrap">
        <div
          className="flex items-center justify-center border-2 border-dashed border-brand-border rounded-xl"
          style={{ width: tipo === 'logo' ? 240 : 80, height: 80, flexShrink: 0, background: '#161616' }}
        >
          {preview ? (
            <Image src={preview} alt={spec.title} width={spec.previewW} height={spec.previewH}
              className={tipo === 'logo' ? 'object-contain max-h-[56px] max-w-[220px]' : 'object-contain w-12 h-12'}
              unoptimized />
          ) : (
            <div className="flex flex-col items-center gap-1 text-brand-muted">
              <ImageIcon className="w-6 h-6" />
              <span className="text-[10px] font-ui">Sin {spec.title.toLowerCase()}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-ui font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {preview ? 'Reemplazar' : 'Subir archivo'}
          </button>
          {preview && (
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 text-red-400 text-sm font-ui font-semibold hover:bg-red-500/10 transition-colors disabled:opacity-60">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Eliminar
            </button>
          )}
          <input ref={fileRef} type="file" accept={spec.accept} className="hidden" onChange={handleFile} />
        </div>
      </div>

      <div className="rounded-xl p-3 flex gap-2" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#60a5fa' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: '#93c5fd' }}>{spec.recomendacion}</p>
          <p className="text-xs mt-0.5" style={{ color: '#7dd3fc' }}>{spec.detalle}</p>
        </div>
      </div>
    </div>
  )
}

function TopbarSection({ marca, onChange }: { marca: Marca; onChange: (m: Marca) => void }) {
  const [saving, setSaving] = useState(false)
  const [redes, setRedes]   = useState<RedSocial[]>(marca.topbar_redes ?? [])
  const [form, setForm]     = useState({
    topbar_activo:     marca.topbar_activo,
    topbar_ubicacion:  marca.topbar_ubicacion  ?? '',
    topbar_telefono:   marca.topbar_telefono   ?? '',
    topbar_correo:     marca.topbar_correo     ?? '',
    topbar_bg_color:   marca.topbar_bg_color   ?? '#1c1c1c',
    topbar_text_color: marca.topbar_text_color ?? '#ffffff',
    topbar_icon_color: marca.topbar_icon_color ?? '#ffffff',
  })

  const addRed    = () => setRedes(r => [...r, { red: 'facebook', url: '' }])
  const removeRed = (i: number) => setRedes(r => r.filter((_, idx) => idx !== i))
  const updateRed = (i: number, field: 'red' | 'url', val: string) =>
    setRedes(r => r.map((item, idx) => idx === i ? { ...item, [field]: val } : item))

  const handleSave = async () => {
    setSaving(true)
    const payload = { ...form, topbar_redes: redes }
    const res = await fetch('/api/admin/topbar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) { toast.error('Error al guardar'); return }
    toast.success('Barra superior actualizada')
    onChange({ ...marca, ...payload })
  }

  return (
    <div className={`${card} space-y-6`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-ui font-semibold text-brand-text text-lg flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Barra superior
          </h2>
          <p className="text-brand-muted text-sm mt-0.5">
            Franja informativa que aparece encima del menú de navegación.
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-sm font-ui text-brand-muted">Visible</span>
          <button
            onClick={() => setForm(f => ({ ...f, topbar_activo: !f.topbar_activo }))}
            className={`relative w-10 h-6 rounded-full transition-colors ${form.topbar_activo ? 'bg-primary' : 'bg-brand-border'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.topbar_activo ? 'left-5' : 'left-1'}`} />
          </button>
        </label>
      </div>

      {/* Info fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {([
          { key: 'topbar_ubicacion' as const, label: 'Ubicación',   icon: MapPin,  ph: 'México · Sorteos verificados' },
          { key: 'topbar_telefono'  as const, label: 'Teléfono',    icon: Phone,   ph: '+52 33 1738 5212' },
          { key: 'topbar_correo'   as const, label: 'Correo',      icon: Mail,    ph: 'hola@rifandomas.com' },
        ]).map(({ key, label, icon: Icon, ph }) => (
          <div key={key}>
            <label className="text-xs font-ui font-semibold text-brand-muted mb-1 flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" /> {label}
            </label>
            <input
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              placeholder={ph}
              className={darkInput}
            />
          </div>
        ))}
      </div>

      {/* Colors */}
      <div>
        <label className="text-xs font-ui font-semibold text-brand-muted uppercase tracking-wide mb-3 block">
          Colores
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {([
            { key: 'topbar_bg_color'   as const, label: 'Fondo'   },
            { key: 'topbar_text_color' as const, label: 'Texto'   },
            { key: 'topbar_icon_color' as const, label: 'Íconos'  },
          ]).map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs font-ui text-brand-muted mb-1.5 block">{label}</label>
              <div className="flex items-center gap-2 border border-brand-border rounded-xl px-3 py-2 bg-[#161616]">
                <label className="flex-shrink-0 cursor-pointer">
                  <span className="block w-7 h-7 rounded-md border border-white/20" style={{ background: form[key] }} />
                  <input type="color" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="sr-only" />
                </label>
                <input
                  type="text"
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="flex-1 text-sm font-mono text-white bg-transparent focus:outline-none"
                  maxLength={7}
                  placeholder="#000000"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Live preview */}
        <div className="rounded-lg overflow-hidden border border-brand-border">
          <div className="px-4 py-2 flex items-center justify-between text-xs" style={{ background: form.topbar_bg_color, color: form.topbar_text_color }}>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" style={{ color: form.topbar_icon_color }} /> Ubicación
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" style={{ color: form.topbar_icon_color }} /> Teléfono
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" style={{ color: form.topbar_icon_color }} /> correo@ejemplo.com
            </span>
          </div>
          <div className="bg-brand-card px-3 py-1.5 text-[10px] text-brand-muted text-center font-ui">
            Vista previa
          </div>
        </div>
      </div>

      {/* Social */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-ui font-semibold text-brand-muted uppercase tracking-wide">
            Redes sociales
          </label>
          <button onClick={addRed}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-ui font-semibold hover:bg-primary/20 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Agregar red
          </button>
        </div>

        {redes.length === 0 && (
          <p className="text-brand-muted text-sm text-center py-4 border-2 border-dashed border-brand-border rounded-xl">
            Sin redes sociales. Haz clic en "Agregar red" para comenzar.
          </p>
        )}

        <div className="space-y-2">
          {redes.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={r.red}
                onChange={e => updateRed(i, 'red', e.target.value)}
                className="border border-white/10 rounded-xl px-3 py-2 text-sm text-white bg-[#161616] focus:outline-none focus:border-primary w-36 flex-shrink-0"
              >
                {REDES_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input
                value={r.url}
                onChange={e => updateRed(i, 'url', e.target.value)}
                placeholder="https://..."
                className={`flex-1 border border-white/10 rounded-xl px-3 py-2 text-sm text-white bg-[#161616] focus:outline-none focus:border-primary placeholder:text-white/30`}
              />
              <button onClick={() => removeRed(i)}
                className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-brand-border">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-ui font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Guardar barra superior
        </button>
      </div>
    </div>
  )
}

export default function AdminMarcaPage() {
  const [marca, setMarca] = useState<Marca>({
    logo_url: null, favicon_url: null,
    topbar_activo: true, topbar_ubicacion: null,
    topbar_telefono: null, topbar_correo: null, topbar_redes: [],
    topbar_bg_color: '#1c1c1c', topbar_text_color: '#ffffff', topbar_icon_color: '#ffffff',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/marca-get')
      .then(r => r.json())
      .then(d => {
        setMarca({
          ...d,
          topbar_redes:      d.topbar_redes      ?? [],
          topbar_bg_color:   d.topbar_bg_color   ?? '#1c1c1c',
          topbar_text_color: d.topbar_text_color ?? '#ffffff',
          topbar_icon_color: d.topbar_icon_color ?? '#ffffff',
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-title text-3xl text-brand-text tracking-wide">IDENTIDAD DE MARCA</h1>
        <p className="text-brand-muted text-sm font-body mt-1">
          Gestiona el logo, favicon y la barra superior de información.
        </p>
      </div>

      <AssetSection tipo="logo"    currentUrl={marca.logo_url}
        onUploaded={url => setMarca(p => ({ ...p, logo_url: url }))}
        onDeleted={() => setMarca(p => ({ ...p, logo_url: null }))} />

      <AssetSection tipo="favicon" currentUrl={marca.favicon_url}
        onUploaded={url => setMarca(p => ({ ...p, favicon_url: url }))}
        onDeleted={() => setMarca(p => ({ ...p, favicon_url: null }))} />

      <TopbarSection marca={marca} onChange={setMarca} />

      <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24' }}>
        <strong>Nota:</strong> Requiere el bucket{' '}
        <code className="font-mono px-1 rounded" style={{ background: 'rgba(245,158,11,0.15)' }}>brand</code>{' '}
        en Supabase Storage con acceso público.
      </div>
    </div>
  )
}
