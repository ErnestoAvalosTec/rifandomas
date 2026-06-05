'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, Trash2 } from 'lucide-react'

const perfilSchema = z.object({
  nombre: z.string().min(2),
  apellidos: z.string().min(2),
  telefono: z.string().optional(),
})

const passwordSchema = z.object({
  nueva: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmar: z.string(),
}).refine((d) => d.nueva === d.confirmar, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmar'],
})

type PerfilForm = z.infer<typeof perfilSchema>
type PasswordForm = z.infer<typeof passwordSchema>

interface Cuenta {
  id?: string
  banco: string
  clabe: string
  titular: string
  activo: boolean
}

export default function ConfiguracionPage() {
  const supabase = createClient()
  const sb = supabase as any
  const [cargando, setCargando] = useState(false)
  const [guardandoPass, setGuardandoPass] = useState(false)
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [userId, setUserId] = useState<string>('')

  const perfilForm = useForm<PerfilForm>({ resolver: zodResolver(perfilSchema) })
  const passForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: perfil } = await sb.from('perfiles').select('*').eq('id', user.id).single()
      if (perfil) {
        perfilForm.reset({ nombre: perfil.nombre, apellidos: perfil.apellidos, telefono: perfil.telefono ?? '' })
      }

      const { data: cuentasDB } = await sb.from('cuentas_deposito').select('*').eq('usuario_id', user.id)
      if (cuentasDB) setCuentas(cuentasDB)
    }
    cargar()
  }, [])

  const guardarPerfil = async (data: PerfilForm) => {
    setCargando(true)
    const { error } = await sb.from('perfiles').update(data).eq('id', userId)
    setCargando(false)
    if (error) toast.error('Error al guardar')
    else toast.success('Perfil actualizado')
  }

  const cambiarPassword = async (data: PasswordForm) => {
    setGuardandoPass(true)
    const { error } = await supabase.auth.updateUser({ password: data.nueva })
    setGuardandoPass(false)
    if (error) toast.error('No se pudo cambiar la contraseña')
    else { toast.success('Contraseña actualizada'); passForm.reset() }
  }

  const guardarCuentas = async () => {
    await sb.from('cuentas_deposito').delete().eq('usuario_id', userId)
    await sb.from('cuentas_deposito').insert(
      cuentas.map(({ id: _id, ...c }) => ({ ...c, usuario_id: userId }))
    )
    toast.success('Cuentas guardadas')
  }

  const agregarCuenta = () => setCuentas([...cuentas, { banco: '', clabe: '', titular: '', activo: true }])
  const eliminarCuenta = (i: number) => setCuentas(cuentas.filter((_, idx) => idx !== i))

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-title text-4xl text-white tracking-wide">CONFIGURACIÓN</h1>
        <p className="text-brand-muted font-body text-sm mt-1">Administra tu cuenta y cuentas de depósito.</p>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-4">
        <h2 className="font-ui font-semibold text-white">Datos personales</h2>
        <form onSubmit={perfilForm.handleSubmit(guardarPerfil)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nombre(s)</Label>
              <Input {...perfilForm.register('nombre')} />
            </div>
            <div className="space-y-1.5">
              <Label>Apellidos</Label>
              <Input {...perfilForm.register('apellidos')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Teléfono WhatsApp</Label>
            <Input placeholder="10 dígitos" {...perfilForm.register('telefono')} />
          </div>
          <Button type="submit" disabled={cargando} className="w-full">
            {cargando ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</> : 'Guardar cambios'}
          </Button>
        </form>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-4">
        <h2 className="font-ui font-semibold text-white">Cambiar contraseña</h2>
        <form onSubmit={passForm.handleSubmit(cambiarPassword)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nueva contraseña</Label>
            <Input type="password" {...passForm.register('nueva')} />
            {passForm.formState.errors.nueva && <p className="text-xs text-red-400">{passForm.formState.errors.nueva.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar contraseña</Label>
            <Input type="password" {...passForm.register('confirmar')} />
            {passForm.formState.errors.confirmar && <p className="text-xs text-red-400">{passForm.formState.errors.confirmar.message}</p>}
          </div>
          <Button type="submit" variant="outline" disabled={guardandoPass} className="w-full">
            {guardandoPass ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Cambiar contraseña
          </Button>
        </form>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-ui font-semibold text-white">Cuentas de depósito</h2>
          <Button type="button" variant="outline" size="sm" onClick={agregarCuenta} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />Agregar
          </Button>
        </div>
        {cuentas.map((c, i) => (
          <div key={i} className="p-4 rounded-xl border border-brand-border/60 bg-brand-border/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-ui text-brand-muted">Cuenta {i + 1}</span>
              <button type="button" onClick={() => eliminarCuenta(i)} className="text-brand-muted hover:text-red-400 transition-colors cursor-pointer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Banco" value={c.banco} onChange={(e) => setCuentas(cuentas.map((cc, idx) => idx === i ? { ...cc, banco: e.target.value } : cc))} />
              <Input placeholder="Titular" value={c.titular} onChange={(e) => setCuentas(cuentas.map((cc, idx) => idx === i ? { ...cc, titular: e.target.value } : cc))} />
            </div>
            <Input placeholder="CLABE (18 dígitos)" maxLength={18} value={c.clabe} onChange={(e) => setCuentas(cuentas.map((cc, idx) => idx === i ? { ...cc, clabe: e.target.value } : cc))} />
          </div>
        ))}
        {cuentas.length > 0 && <Button onClick={guardarCuentas} className="w-full">Guardar cuentas</Button>}
      </div>
    </div>
  )
}
