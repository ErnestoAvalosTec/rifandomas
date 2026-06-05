'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Ticket, Loader2, Eye, EyeOff } from 'lucide-react'

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  apellidos: z.string().min(2, 'Requerido'),
  telefono: z.string().length(10, '10 dígitos sin código de país'),
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm'],
})

type RegistroForm = z.infer<typeof schema>

export default function RegistroPage() {
  const supabase = createClient()
  const router = useRouter()
  const [cargando, setCargando] = useState(false)
  const [verPassword, setVerPassword] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<RegistroForm>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: RegistroForm) => {
    setCargando(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (authError || !authData.user) {
      toast.error(authError?.message ?? 'Error al crear la cuenta.')
      setCargando(false)
      return
    }

    const { error: perfilError } = await (supabase as any).from('perfiles').insert({
      id: authData.user.id,
      nombre: data.nombre,
      apellidos: data.apellidos,
      telefono: data.telefono,
      rol: 'usuario',
    })

    if (perfilError) {
      toast.error('No se pudo crear el perfil. Contacta soporte.')
      setCargando(false)
      return
    }

    toast.success('¡Cuenta creada! Bienvenido a Rifando+')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-brand-bg bg-dot-pattern flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <span className="font-title text-3xl tracking-wider text-white">RIFANDO<span className="text-primary">+</span></span>
          </Link>
        </div>

        <div className="bg-brand-card border border-brand-border rounded-2xl p-8">
          <h1 className="font-title text-4xl text-white mb-1 tracking-wide">CREAR CUENTA</h1>
          <p className="text-brand-muted text-sm font-body mb-6">Únete y empieza a organizar sorteos hoy mismo.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre(s)</Label>
                <Input id="nombre" placeholder="Tu nombre" {...register('nombre')} />
                {errors.nombre && <p className="text-xs text-red-400">{errors.nombre.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="apellidos">Apellidos</Label>
                <Input id="apellidos" placeholder="Apellidos" {...register('apellidos')} />
                {errors.apellidos && <p className="text-xs text-red-400">{errors.apellidos.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefono">Teléfono WhatsApp</Label>
              <div className="flex gap-2">
                <span className="flex h-10 items-center px-3 rounded-lg border border-brand-border bg-brand-border/30 text-sm text-brand-muted font-ui select-none">+52</span>
                <Input id="telefono" placeholder="10 dígitos" maxLength={10} {...register('telefono')} />
              </div>
              {errors.telefono && <p className="text-xs text-red-400">{errors.telefono.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" placeholder="tu@correo.com" {...register('email')} />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input id="password" type={verPassword ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" className="pr-10" {...register('password')} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white transition-colors cursor-pointer" onClick={() => setVerPassword(!verPassword)}>
                  {verPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirmar contraseña</Label>
              <Input id="confirm" type="password" placeholder="Repite tu contraseña" {...register('confirm')} />
              {errors.confirm && <p className="text-xs text-red-400">{errors.confirm.message}</p>}
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={cargando}>
              {cargando ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creando cuenta...</> : 'Crear Cuenta Gratis'}
            </Button>
          </form>

          <p className="text-center text-sm text-brand-muted font-body mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary hover:underline font-semibold">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
