'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Loader2, Upload } from 'lucide-react'
import type { Database } from '@/types/database.types'

type SorteoRow = Database['public']['Tables']['sorteos']['Row']

const DESCRIPCION_MAX = 80

const premioSchema = z.object({
  nombre: z.string().min(2),
  descripcion: z.string().max(DESCRIPCION_MAX, `Máximo ${DESCRIPCION_MAX} caracteres`).optional(),
  valor_estimado: z.coerce.number().min(0).optional(),
  imagen_url: z.string().optional(),
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
  premios: z.array(premioSchema).min(1, 'Agrega al menos 1 premio').max(3),
  cuentas: z.array(cuentaSchema).min(1, 'Agrega al menos 1 cuenta de depósito'),
})

type FormValues = z.infer<typeof schema>

type PremioInicial = { nombre: string; descripcion?: string | null; valor_estimado?: number | null; imagen_url?: string | null }

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
        ? premiosIniciales.map((p) => ({ nombre: p.nombre, descripcion: p.descripcion ?? '', valor_estimado: p.valor_estimado ?? 0, imagen_url: p.imagen_url ?? '' }))
        : [{ nombre: '', descripcion: '', valor_estimado: 0, imagen_url: '' }],
      cuentas: [{ banco: '', clabe: '', titular: '' }],
    },
  })

  const { fields: premioFields, append: appendPremio, remove: removePremio } = useFieldArray({ control, name: 'premios' })
  const { fields: cuentaFields, append: appendCuenta, remove: removeCuenta } = useFieldArray({ control, name: 'cuentas' })

  const uploadImagen = async (file: File, index: number) => {
    const ext = file.name.split('.').pop()
    const path = `premios/${userId}/${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('premios').upload(path, file, { upsert: true })
    if (error) { toast.error('Error al subir imagen'); return }
    const { data: { publicUrl } } = supabase.storage.from('premios').getPublicUrl(data.path)
    setValue(`premios.${index}.imagen_url`, publicUrl)
    toast.success('Imagen subida')
  }

  const onSubmit = async (values: FormValues) => {
    setGuardando(true)
    try {
      let sorteoId = sorteo?.id

      if (isEdit && sorteoId) {
        const { error } = await sb.from('sorteos').update({
          nombre: values.nombre,
          descripcion: values.descripcion,
          fecha_sorteo: values.fecha_sorteo,
          total_numeros: values.total_numeros,
          precio_unitario: values.precio_unitario,
          promo_activa: values.promo_activa,
          promo_tipo: values.promo_tipo,
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
          total_numeros: values.total_numeros,
          precio_unitario: values.precio_unitario,
          promo_activa: values.promo_activa,
          promo_tipo: values.promo_tipo,
          estatus: adminMode ? 'activo' : 'pendiente',
        }).select().single()
        if (error) throw error
        if (!data) throw new Error('Insert de sorteo no devolvió datos')
        sorteoId = data.id

        if (adminMode) {
          const boletos = Array.from({ length: values.total_numeros }, (_, i) => ({
            sorteo_id: sorteoId!,
            numero: String(i + 1).padStart(4, '0'),
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
        }))
      )
      if (premiosError) throw premiosError

      await sb.from('cuentas_deposito').delete().eq('usuario_id', userId)
      const { error: cuentasError } = await sb.from('cuentas_deposito').insert(
        values.cuentas.map((c) => ({ usuario_id: userId, banco: c.banco, clabe: c.clabe, titular: c.titular }))
      )
      if (cuentasError) throw cuentasError

      toast.success(adminMode && !isEdit ? 'Sorteo publicado exitosamente.' : adminMode && isEdit ? 'Sorteo actualizado.' : 'Sorteo enviado a revisión. El administrador lo aprobará pronto.')
      router.push(adminMode ? '/admin/sorteos' : '/dashboard/sorteos')
      router.refresh()
    } catch (err: unknown) {
      const supabaseErr = err as { code?: string; message?: string; details?: string; hint?: string }
      console.error('[SorteoForm] Error al guardar:', {
        code: supabaseErr?.code,
        message: supabaseErr?.message,
        details: supabaseErr?.details,
        hint: supabaseErr?.hint,
        raw: err,
      })
      toast.error(`Error al guardar el sorteo. ${supabaseErr?.message ?? ''}`)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
      <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-4">
        <h2 className="font-ui font-semibold text-brand-text">Información del sorteo</h2>
        <div className="space-y-1.5">
          <Label>Nombre del sorteo</Label>
          <Input placeholder="Ej: Rifa iPhone 16 Pro" {...register('nombre')} />
          {errors.nombre && <p className="text-xs text-red-400">{errors.nombre.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Descripción (opcional)</Label>
          <textarea className="flex w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[80px] resize-none" placeholder="Descripción corta del sorteo..." {...register('descripcion')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Fecha tentativa del sorteo</Label>
            <Input type="date" {...register('fecha_sorteo')} />
            {errors.fecha_sorteo && <p className="text-xs text-red-400">{errors.fecha_sorteo.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Total de números</Label>
            <Input type="number" min={10} max={10000} placeholder="100" {...register('total_numeros')} />
            {errors.total_numeros && <p className="text-xs text-red-400">{errors.total_numeros.message}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Precio por boleto (MXN)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted font-ui text-sm">$</span>
            <Input type="number" min={1} step="0.01" className="pl-7" placeholder="50" {...register('precio_unitario')} />
          </div>
          {errors.precio_unitario && <p className="text-xs text-red-400">{errors.precio_unitario.message}</p>}
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-ui font-semibold text-brand-text">Premios (máx. 3)</h2>
          {premioFields.length < 3 && (
            <Button type="button" variant="outline" size="sm" onClick={() => appendPremio({ nombre: '', descripcion: '', valor_estimado: 0, imagen_url: '' })} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />Agregar
            </Button>
          )}
        </div>
        {premioFields.map((field, i) => (
          <div key={field.id} className="p-4 rounded-xl border border-brand-border/60 bg-brand-border/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-ui text-primary font-semibold">{i + 1}° Premio</span>
              {i > 0 && <button type="button" onClick={() => removePremio(i)} className="text-brand-muted hover:text-red-400 transition-colors cursor-pointer"><Trash2 className="w-4 h-4" /></button>}
            </div>
            <Input placeholder="Nombre del premio" {...register(`premios.${i}.nombre`)} />
            <div className="space-y-1">
              <Input placeholder={`Descripción breve (máx. ${DESCRIPCION_MAX} caracteres)`} maxLength={DESCRIPCION_MAX} {...register(`premios.${i}.descripcion`)} />
              <p className="text-right text-xs text-brand-muted font-ui">
                {watch(`premios.${i}.descripcion`)?.length ?? 0}/{DESCRIPCION_MAX}
              </p>
              {errors.premios?.[i]?.descripcion && <p className="text-xs text-red-400">{errors.premios[i]?.descripcion?.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted text-sm">$</span>
                <Input type="number" placeholder="Valor estimado" className="pl-7" {...register(`premios.${i}.valor_estimado`)} />
              </div>
              <label className="flex items-center gap-2 h-10 px-3 rounded-lg border border-brand-border bg-brand-card cursor-pointer hover:border-primary/50 transition-colors text-xs text-brand-muted font-ui">
                <Upload className="w-3.5 h-3.5" />
                Subir imagen
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImagen(file, i) }} />
              </label>
            </div>
          </div>
        ))}
        {errors.premios && <p className="text-xs text-red-400">Agrega al menos 1 premio.</p>}
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-ui font-semibold text-brand-text">Cuentas de depósito</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => appendCuenta({ banco: '', clabe: '', titular: '' })} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />Agregar
          </Button>
        </div>
        {cuentaFields.map((field, i) => (
          <div key={field.id} className="p-4 rounded-xl border border-brand-border/60 bg-brand-border/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-ui text-brand-muted">Cuenta {i + 1}</span>
              {i > 0 && <button type="button" onClick={() => removeCuenta(i)} className="text-brand-muted hover:text-red-400 transition-colors cursor-pointer"><Trash2 className="w-4 h-4" /></button>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Banco (ej: BBVA)" {...register(`cuentas.${i}.banco`)} />
              <Input placeholder="Titular" {...register(`cuentas.${i}.titular`)} />
            </div>
            <Input placeholder="CLABE interbancaria (18 dígitos)" maxLength={18} {...register(`cuentas.${i}.clabe`)} />
            {errors.cuentas?.[i]?.clabe && <p className="text-xs text-red-400">{errors.cuentas[i]?.clabe?.message}</p>}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" className="flex-1" disabled={guardando}>
          {guardando ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</> : isEdit ? 'Actualizar Sorteo' : adminMode ? 'Publicar Sorteo' : 'Enviar a Revisión'}
        </Button>
      </div>
    </form>
  )
}
