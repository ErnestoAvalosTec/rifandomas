'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Loader2, ImagePlus, X, Banknote, Image as ImageIcon, Upload } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CATEGORIAS } from '@/lib/utils'
import type { Database } from '@/types/database.types'

type SorteoRow = Database['public']['Tables']['sorteos']['Row']
type ImagenPredeterminada = Database['public']['Tables']['imagenes_predeterminadas']['Row']

const DESCRIPCION_MAX = 80
const MAX_FOTOS = 6

const premioSchema = z.object({
  nombre: z.string().min(2),
  descripcion: z.string().max(DESCRIPCION_MAX, `Máximo ${DESCRIPCION_MAX} caracteres`).optional(),
  valor_estimado: z.coerce.number().min(0).optional(),
  imagen_url: z.string().min(1, 'Selecciona una portada'),
  intercambiable_efectivo: z.boolean().default(false),
  fotos_urls: z.array(z.string()).default([]),
})

const cuentaSchema = z.object({
  banco: z.string().min(2),
  clabe: z.string().length(18, 'La CLABE debe tener 18 dígitos'),
  titular: z.string().min(2),
})

const schema = z.object({
  nombre: z.string().min(3, 'Mínimo 3 caracteres'),
  descripcion: z.string().optional(),
  fecha_sorteo: z.string().min(1, 'Selecciona una fecha'),
  total_numeros: z.coerce.number().min(10).max(10000),
  precio_unitario: z.coerce.number().min(1),
  promo_activa: z.boolean().default(false),
  promo_tipo: z.enum(['x_por_y', 'compra_lleva']).optional(),
  premios: z.array(premioSchema).min(1, 'Agrega al menos 1 premio').max(5),
  cuentas: z.array(cuentaSchema).default([]),
})

type FormValues = z.infer<typeof schema>

type PremioInicial = {
  nombre: string
  descripcion?: string | null
  valor_estimado?: number | null
  imagen_url?: string | null
  intercambiable_efectivo?: boolean | null
  fotos_urls?: string[] | null
}

type CuentaExistente = { id: string; banco: string; clabe: string; titular: string; activo: boolean }

interface SorteoFormProps {
  sorteo?: SorteoRow
  userId: string
  adminMode?: boolean
  premiosIniciales?: PremioInicial[]
}

export function SorteoForm({ sorteo, userId, adminMode = false, premiosIniciales }: SorteoFormProps) {
  const supabase = createClient()
  const sb = supabase as any
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)
  const [esLoteria, setEsLoteria] = useState<boolean>((sorteo as any)?.es_loteria ?? false)
  const [digitosLoteria, setDigitosLoteria] = useState<number>(() => {
    if ((sorteo as any)?.es_loteria && sorteo?.total_numeros) {
      const d = Math.round(Math.log10(sorteo.total_numeros))
      if (d === 2 || d === 3 || d === 4) return d
    }
    return 3
  })
  const [cuentasExistentes, setCuentasExistentes] = useState<CuentaExistente[]>([])
  const [cuentaSeleccionadaId, setCuentaSeleccionadaId] = useState<string | null>(null)
  const [uploading, setUploading] = useState<Record<number, boolean>>({})
  const [uploadingPortada, setUploadingPortada] = useState<Record<number, boolean>>({})
  const [galeriaAbierta, setGaleriaAbierta] = useState<number | null>(null)
  const [categoriaGaleria, setCategoriaGaleria] = useState<string>(CATEGORIAS[0])
  const [imagenesGaleria, setImagenesGaleria] = useState<ImagenPredeterminada[]>([])

  const isEdit = !!sorteo

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre: sorteo?.nombre ?? '',
      descripcion: sorteo?.descripcion ?? '',
      fecha_sorteo: sorteo?.fecha_sorteo ?? '',
      total_numeros: sorteo?.total_numeros ?? 100,
      precio_unitario: sorteo?.precio_unitario ?? 50,
      promo_activa: sorteo?.promo_activa ?? false,
      promo_tipo: sorteo?.promo_tipo ?? undefined,
      premios: premiosIniciales?.length
        ? premiosIniciales.map((p) => ({
            nombre: p.nombre,
            descripcion: p.descripcion ?? '',
            valor_estimado: p.valor_estimado ?? 0,
            imagen_url: p.imagen_url ?? '',
            intercambiable_efectivo: p.intercambiable_efectivo ?? false,
            fotos_urls: p.fotos_urls ?? [],
          }))
        : [{ nombre: '', descripcion: '', valor_estimado: 0, imagen_url: '', intercambiable_efectivo: false, fotos_urls: [] }],
      cuentas: [],
    },
  })

  const { fields: premioFields, append: appendPremio, remove: removePremio } = useFieldArray({ control, name: 'premios' })
  const { fields: cuentaFields, append: appendCuenta, remove: removeCuenta } = useFieldArray({ control, name: 'cuentas' })

  useEffect(() => {
    const cargarCuentas = async () => {
      const { data } = await sb.from('cuentas_deposito').select('*').eq('usuario_id', userId)
      if (data?.length) {
        setCuentasExistentes(data)
        setCuentaSeleccionadaId(data.find((c: CuentaExistente) => c.activo)?.id ?? data[0].id)
      } else {
        appendCuenta({ banco: '', clabe: '', titular: '' })
      }
    }
    cargarCuentas()
  }, [userId])

  const cargarGaleria = async (categoria: string) => {
    const { data } = await sb
      .from('imagenes_predeterminadas')
      .select('*')
      .eq('categoria', categoria)
      .eq('activo', true)
      .order('orden', { ascending: true })
    setImagenesGaleria(data ?? [])
  }

  useEffect(() => {
    if (galeriaAbierta !== null) cargarGaleria(categoriaGaleria)
  }, [galeriaAbierta, categoriaGaleria])

  const toggleLoteria = (checked: boolean) => {
    setEsLoteria(checked)
    if (checked) setValue('total_numeros', Math.pow(10, digitosLoteria))
    else setValue('total_numeros', 100)
  }

  const handleDigitosChange = (d: number) => {
    setDigitosLoteria(d)
    setValue('total_numeros', Math.pow(10, d))
  }

  const uploadFoto = async (files: FileList, premioIndex: number) => {
    const current = watch(`premios.${premioIndex}.fotos_urls`) ?? []
    const disponibles = MAX_FOTOS - current.length
    if (disponibles <= 0) { toast.error(`Máximo ${MAX_FOTOS} fotos por premio`); return }

    setUploading((prev) => ({ ...prev, [premioIndex]: true }))
    const filesToUpload = Array.from(files).slice(0, disponibles)
    const nuevasUrls: string[] = []

    for (const file of filesToUpload) {
      const ext = file.name.split('.').pop()
      const path = `premios/${userId}/fotos/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
      const { data, error } = await supabase.storage.from('premios').upload(path, file, { upsert: true })
      if (error) { toast.error(`Error al subir ${file.name}`); continue }
      const { data: { publicUrl } } = supabase.storage.from('premios').getPublicUrl(data.path)
      nuevasUrls.push(publicUrl)
    }

    if (nuevasUrls.length) {
      const updated = [...current, ...nuevasUrls]
      setValue(`premios.${premioIndex}.fotos_urls`, updated, { shouldDirty: true })
      toast.success(`${nuevasUrls.length} foto${nuevasUrls.length > 1 ? 's' : ''} agregada${nuevasUrls.length > 1 ? 's' : ''}`)
    }

    setUploading((prev) => ({ ...prev, [premioIndex]: false }))
  }

  const removeFoto = (premioIndex: number, fotoIndex: number) => {
    const current = watch(`premios.${premioIndex}.fotos_urls`) ?? []
    const updated = current.filter((_, j) => j !== fotoIndex)
    setValue(`premios.${premioIndex}.fotos_urls`, updated, { shouldDirty: true })
  }

  const seleccionarPortadaGaleria = (premioIndex: number, url: string) => {
    setValue(`premios.${premioIndex}.imagen_url`, url, { shouldDirty: true, shouldValidate: true })
    setGaleriaAbierta(null)
    toast.success('Portada seleccionada')
  }

  const uploadPortadaPersonalizada = async (file: File, premioIndex: number) => {
    setUploadingPortada((prev) => ({ ...prev, [premioIndex]: true }))
    const ext = file.name.split('.').pop()
    const path = `premios/${userId}/portada/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
    const { data, error } = await supabase.storage.from('premios').upload(path, file, { upsert: true })
    if (error) {
      toast.error('Error al subir la imagen')
    } else {
      const { data: { publicUrl } } = supabase.storage.from('premios').getPublicUrl(data.path)
      setValue(`premios.${premioIndex}.imagen_url`, publicUrl, { shouldDirty: true, shouldValidate: true })
      toast.success('Portada actualizada')
    }
    setUploadingPortada((prev) => ({ ...prev, [premioIndex]: false }))
  }

  const onSubmit = async (values: FormValues) => {
    if (!cuentaSeleccionadaId && values.cuentas.length === 0) {
      toast.error('Selecciona o agrega una cuenta de depósito')
      return
    }
    setGuardando(true)
    try {
      let sorteoId = sorteo?.id

      const totalNums = esLoteria ? Math.pow(10, digitosLoteria) : values.total_numeros
      const digits = esLoteria ? digitosLoteria : String(values.total_numeros).length

      if (isEdit && sorteoId) {
        const { error } = await sb.from('sorteos').update({
          nombre: values.nombre,
          descripcion: values.descripcion,
          fecha_sorteo: values.fecha_sorteo,
          total_numeros: totalNums,
          precio_unitario: values.precio_unitario,
          promo_activa: values.promo_activa,
          promo_tipo: values.promo_tipo,
          es_loteria: esLoteria,
          ...(adminMode ? {} : { estatus: 'pendiente' }),
          updated_at: new Date().toISOString(),
        }).eq('id', sorteoId)
        if (error) throw error
      } else {
        const { data, error } = await sb.from('sorteos').insert({
          usuario_id: userId,
          nombre: values.nombre,
          descripcion: values.descripcion,
          fecha_sorteo: values.fecha_sorteo,
          total_numeros: totalNums,
          precio_unitario: values.precio_unitario,
          promo_activa: values.promo_activa,
          promo_tipo: values.promo_tipo,
          es_loteria: esLoteria,
          estatus: adminMode ? 'activo' : 'pendiente',
        }).select().single()
        if (error) throw error
        if (!data) throw new Error('Insert de sorteo no devolvió datos')
        sorteoId = data.id

        if (adminMode) {
          const boletos = Array.from({ length: totalNums }, (_, i) => ({
            sorteo_id: sorteoId!,
            numero: String(esLoteria ? i : i + 1).padStart(digits, '0'),
            estatus: 'disponible' as const,
          }))
          for (let i = 0; i < boletos.length; i += 500) {
            const { error: errBoletos } = await sb.from('boletos').insert(boletos.slice(i, i + 500))
            if (errBoletos) throw errBoletos
          }
        }
      }

      if (isEdit) { await sb.from('premios').delete().eq('sorteo_id', sorteoId) }
      const { error: premiosError } = await sb.from('premios').insert(
        values.premios.map((p, i) => ({
          sorteo_id: sorteoId,
          lugar: i + 1,
          nombre: p.nombre,
          descripcion: p.descripcion,
          imagen_url: p.imagen_url,
          valor_estimado: p.valor_estimado,
          intercambiable_efectivo: p.intercambiable_efectivo ?? false,
          fotos_urls: p.fotos_urls ?? [],
        }))
      )
      if (premiosError) throw premiosError

      if (cuentaSeleccionadaId) {
        await sb.from('cuentas_deposito').update({ activo: false }).eq('usuario_id', userId)
        await sb.from('cuentas_deposito').update({ activo: true }).eq('id', cuentaSeleccionadaId)
      } else if (values.cuentas.length) {
        await sb.from('cuentas_deposito').update({ activo: false }).eq('usuario_id', userId)
        await sb.from('cuentas_deposito').insert(
          values.cuentas.map((c, i) => ({ usuario_id: userId, banco: c.banco, clabe: c.clabe, titular: c.titular, activo: i === 0 }))
        )
      }

      toast.success(
        adminMode && !isEdit ? 'Sorteo publicado exitosamente.' :
        adminMode && isEdit  ? 'Sorteo actualizado.' :
        'Sorteo enviado a revisión. El administrador lo aprobará pronto.'
      )
      router.push(adminMode ? '/admin/sorteos' : '/dashboard/sorteos')
      router.refresh()
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string }
      console.error('[SorteoForm] Error al guardar:', e)
      toast.error(`Error al guardar el sorteo. ${e?.message ?? ''}`)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">

      {/* ── Información del sorteo ── */}
      <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-4">
        <h2 className="font-ui font-semibold text-brand-text">Información del sorteo</h2>
        <div className="space-y-1.5">
          <Label>Nombre del sorteo</Label>
          <Input placeholder="Ej: Rifa iPhone 16 Pro" {...register('nombre')} />
          {errors.nombre && <p className="text-xs text-red-400">{errors.nombre.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Descripción (opcional)</Label>
          <textarea
            className="flex w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[80px] resize-none"
            placeholder="Descripción corta del sorteo..."
            {...register('descripcion')}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha tentativa del sorteo</Label>
          <Input type="date" {...register('fecha_sorteo')} />
          {errors.fecha_sorteo && <p className="text-xs text-red-400">{errors.fecha_sorteo.message}</p>}
        </div>

        {/* Modalidad de números */}
        <label className="flex items-start gap-3 p-3 rounded-xl border border-brand-border bg-brand-border/10 cursor-pointer hover:border-primary/40 transition-colors">
          <input
            type="checkbox"
            checked={esLoteria}
            onChange={(e) => toggleLoteria(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-primary cursor-pointer flex-shrink-0"
          />
          <div>
            <p className="text-sm font-ui font-semibold text-brand-text">Basado en Lotería Nacional</p>
            <p className="text-xs text-brand-muted mt-0.5 leading-relaxed">
              El ganador se determina con los últimos dígitos del sorteo de la Lotería Nacional.
            </p>
          </div>
        </label>

        {esLoteria ? (
          <div className="space-y-3">
            <Label>¿Cuántos dígitos tendrá el número ganador?</Label>
            <div className="grid grid-cols-3 gap-3">
              {([2, 3, 4] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDigitosChange(d)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    digitosLoteria === d
                      ? 'border-primary bg-primary/10'
                      : 'border-brand-border bg-brand-border/20 hover:border-brand-muted'
                  }`}
                >
                  <p className="font-ui font-bold text-brand-text text-sm">{d} dígitos</p>
                  <p className="text-brand-muted text-xs mt-1 font-ui">
                    {'0'.repeat(d)} – {'9'.repeat(d)}
                  </p>
                  <p className="text-primary text-xs font-semibold mt-0.5">
                    {Math.pow(10, d).toLocaleString('es-MX')} combinaciones
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Total de números</Label>
            <Input type="number" min={10} max={10000} placeholder="100" {...register('total_numeros')} />
            {errors.total_numeros && <p className="text-xs text-red-400">{errors.total_numeros.message}</p>}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Precio por boleto (MXN)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted font-ui text-sm">$</span>
            <Input type="number" min={1} step="0.01" className="pl-7" placeholder="50" {...register('precio_unitario')} />
          </div>
          {errors.precio_unitario && <p className="text-xs text-red-400">{errors.precio_unitario.message}</p>}
        </div>
      </div>

      {/* ── Premios ── */}
      <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-ui font-semibold text-brand-text">Premios (máx. 5)</h2>
          {premioFields.length < 5 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendPremio({ nombre: '', descripcion: '', valor_estimado: 0, imagen_url: '', intercambiable_efectivo: false, fotos_urls: [] })}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />Agregar
            </Button>
          )}
        </div>

        {premioFields.map((field, i) => {
          const fotosUrls = watch(`premios.${i}.fotos_urls`) ?? []
          const portadaUrl = watch(`premios.${i}.imagen_url`) ?? ''
          const isUploading = uploading[i] ?? false
          const isUploadingPortada = uploadingPortada[i] ?? false

          return (
            <div key={field.id} className="p-4 rounded-xl border border-brand-border/60 bg-brand-border/10 space-y-4">
              {/* Encabezado del premio */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-ui text-primary font-semibold">{i + 1}° Premio</span>
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => removePremio(i)}
                    className="text-brand-muted hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Nombre */}
              <Input placeholder="Nombre del premio" {...register(`premios.${i}.nombre`)} />

              {/* Descripción */}
              <div className="space-y-1">
                <Input
                  placeholder={`Descripción breve (máx. ${DESCRIPCION_MAX} caracteres)`}
                  maxLength={DESCRIPCION_MAX}
                  {...register(`premios.${i}.descripcion`)}
                />
                <p className="text-right text-xs text-brand-muted font-ui">
                  {watch(`premios.${i}.descripcion`)?.length ?? 0}/{DESCRIPCION_MAX}
                </p>
                {errors.premios?.[i]?.descripcion && (
                  <p className="text-xs text-red-400">{errors.premios[i]?.descripcion?.message}</p>
                )}
              </div>

              {/* Valor estimado */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted text-sm">$</span>
                <Input
                  type="number"
                  placeholder="Valor estimado del premio"
                  className="pl-7"
                  {...register(`premios.${i}.valor_estimado`)}
                />
              </div>

              {/* Intercambiable por efectivo */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-brand-border bg-brand-card cursor-pointer hover:border-primary/40 transition-colors">
                <input
                  type="checkbox"
                  {...register(`premios.${i}.intercambiable_efectivo`)}
                  className="mt-0.5 w-4 h-4 accent-primary cursor-pointer flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-ui font-semibold text-brand-text flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-primary" />
                    Intercambiable por efectivo
                  </p>
                  <p className="text-xs text-brand-muted mt-0.5 leading-relaxed">
                    El ganador podrá elegir recibir el valor del premio en efectivo en lugar del objeto físico.
                    Se mostrará un aviso en las tarjetas públicas del sorteo.
                  </p>
                </div>
              </label>

              {/* Portada */}
              <div className="space-y-2">
                <Label className="text-xs">Portada</Label>
                <div className="flex items-center gap-3">
                  <div
                    className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-brand-card"
                    style={{ border: '2px solid rgba(255,255,255,0.08)' }}
                  >
                    {portadaUrl ? (
                      <Image
                        src={portadaUrl}
                        fill
                        sizes="96px"
                        className="object-cover"
                        alt={`Portada del premio ${i + 1}`}
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-brand-muted" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 justify-center"
                      onClick={() => setGaleriaAbierta(i)}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />Elegir de galería
                    </Button>
                    <label className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border border-brand-border bg-brand-card cursor-pointer hover:border-primary/50 transition-colors text-xs text-brand-muted font-ui">
                      {isUploadingPortada
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Upload className="w-3.5 h-3.5" />
                      }
                      {isUploadingPortada ? 'Subiendo...' : 'Subir personalizada'}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={isUploadingPortada}
                        onChange={(e) => { if (e.target.files?.[0]) uploadPortadaPersonalizada(e.target.files[0], i) }}
                      />
                    </label>
                  </div>
                </div>
                {errors.premios?.[i]?.imagen_url && (
                  <p className="text-xs text-red-400">{errors.premios[i]?.imagen_url?.message}</p>
                )}
              </div>

              {/* Fotos reales del producto */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">
                    Fotos reales del producto{' '}
                    <span className="text-brand-muted font-normal">
                      (opcional, {fotosUrls.length}/{MAX_FOTOS})
                    </span>
                  </Label>
                  {fotosUrls.length < MAX_FOTOS && (
                    <label className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-brand-border bg-brand-card cursor-pointer hover:border-primary/50 transition-colors text-xs text-brand-muted font-ui">
                      {isUploading
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <ImagePlus className="w-3.5 h-3.5" />
                      }
                      {isUploading ? 'Subiendo...' : 'Agregar fotos'}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        disabled={isUploading}
                        onChange={(e) => { if (e.target.files?.length) uploadFoto(e.target.files, i) }}
                      />
                    </label>
                  )}
                </div>

                {fotosUrls.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {fotosUrls.map((url, fIdx) => (
                      <div key={fIdx} className="relative group">
                        <div
                          className="relative aspect-square rounded-lg overflow-hidden"
                          style={{ border: '2px solid rgba(255,255,255,0.08)' }}
                        >
                          <Image
                            src={url}
                            fill
                            sizes="120px"
                            className="object-cover"
                            alt={`Premio ${i + 1} foto ${fIdx + 1}`}
                            unoptimized
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFoto(i, fIdx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          style={{ background: '#EF4444' }}
                          title="Eliminar foto"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="rounded-xl p-4 text-center text-xs text-brand-muted border-2 border-dashed border-brand-border leading-relaxed"
                  >
                    Fotos opcionales del producto real para mostrar en la galería pública del sorteo
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {errors.premios && <p className="text-xs text-red-400">Agrega al menos 1 premio.</p>}
      </div>

      {/* ── Cuentas de depósito ── */}
      <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-4">
        <h2 className="font-ui font-semibold text-brand-text">Cuentas de depósito</h2>

        {cuentasExistentes.length > 0 && (
          <div className="space-y-2">
            <Label>Selecciona la cuenta donde se recibirán los depósitos</Label>
            {cuentasExistentes.map((c) => (
              <label
                key={c.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  cuentaSeleccionadaId === c.id
                    ? 'border-primary bg-primary/10'
                    : 'border-brand-border bg-brand-border/10 hover:border-brand-muted'
                }`}
              >
                <input
                  type="radio"
                  checked={cuentaSeleccionadaId === c.id}
                  onChange={() => setCuentaSeleccionadaId(c.id)}
                  className="w-4 h-4 accent-primary cursor-pointer flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-ui font-semibold text-brand-text truncate">
                    {c.banco} · {c.titular}
                  </p>
                  <p className="text-xs text-brand-muted font-ui">CLABE •••• {c.clabe.slice(-4)}</p>
                </div>
              </label>
            ))}
            <label
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                cuentaSeleccionadaId === null
                  ? 'border-primary bg-primary/10'
                  : 'border-brand-border bg-brand-border/10 hover:border-brand-muted'
              }`}
            >
              <input
                type="radio"
                checked={cuentaSeleccionadaId === null}
                onChange={() => {
                  setCuentaSeleccionadaId(null)
                  if (cuentaFields.length === 0) appendCuenta({ banco: '', clabe: '', titular: '' })
                }}
                className="w-4 h-4 accent-primary cursor-pointer flex-shrink-0"
              />
              <span className="flex items-center gap-1.5 text-sm font-ui font-semibold text-brand-text">
                <Plus className="w-3.5 h-3.5" />Usar una cuenta nueva
              </span>
            </label>
          </div>
        )}

        {(cuentasExistentes.length === 0 || cuentaSeleccionadaId === null) && (
          <div className="space-y-3">
            {cuentasExistentes.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-brand-muted font-ui">Datos de la nueva cuenta</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => appendCuenta({ banco: '', clabe: '', titular: '' })}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />Agregar otra
                </Button>
              </div>
            )}
            {cuentaFields.map((field, i) => (
              <div key={field.id} className="p-4 rounded-xl border border-brand-border/60 bg-brand-border/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-ui text-brand-muted">Cuenta {i + 1}</span>
                  {(cuentasExistentes.length > 0 || i > 0) && (
                    <button
                      type="button"
                      onClick={() => removeCuenta(i)}
                      className="text-brand-muted hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Banco (ej: BBVA)" {...register(`cuentas.${i}.banco`)} />
                  <Input placeholder="Titular" {...register(`cuentas.${i}.titular`)} />
                </div>
                <Input
                  placeholder="CLABE interbancaria (18 dígitos)"
                  maxLength={18}
                  {...register(`cuentas.${i}.clabe`)}
                />
                {errors.cuentas?.[i]?.clabe && (
                  <p className="text-xs text-red-400">{errors.cuentas[i]?.clabe?.message}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Botones ── */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={guardando}>
          {guardando ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</>
          ) : isEdit ? 'Actualizar Sorteo' : adminMode ? 'Publicar Sorteo' : 'Enviar a Revisión'}
        </Button>
      </div>

      {/* ── Selector de portada predeterminada ── */}
      <Dialog open={galeriaAbierta !== null} onOpenChange={(open) => !open && setGaleriaAbierta(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Elegir portada de la galería</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Categoría</Label>
              <select
                value={categoriaGaleria}
                onChange={(e) => setCategoriaGaleria(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-brand-border bg-brand-border/30 px-3 py-2 text-sm text-white font-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-colors duration-200"
              >
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {imagenesGaleria.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {imagenesGaleria.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => galeriaAbierta !== null && seleccionarPortadaGaleria(galeriaAbierta, img.url)}
                    className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                    style={{ border: '2px solid rgba(255,255,255,0.08)' }}
                    title={img.nombre ?? 'Seleccionar'}
                  >
                    <Image src={img.url} fill sizes="120px" className="object-cover" alt={img.nombre ?? 'Imagen predeterminada'} unoptimized />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl p-6 text-center text-xs text-brand-muted border-2 border-dashed border-brand-border leading-relaxed">
                No hay imágenes disponibles en esta categoría todavía.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </form>
  )
}
