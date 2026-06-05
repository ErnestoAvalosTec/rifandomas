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
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type LoginForm = z.infer<typeof schema>

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [cargando, setCargando] = useState(false)
  const [verPassword, setVerPassword] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: LoginForm) => {
    setCargando(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      toast.error('Correo o contraseña incorrectos.')
      setCargando(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCargando(false); return }

    const { data: perfilData } = await (supabase as any)
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    const perfil = perfilData as { rol: string } | null
    router.push(perfil?.rol === 'admin' ? '/admin' : '/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-brand-bg bg-dot-pattern flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <span className="font-title text-3xl tracking-wider text-white">
              RIFANDO<span className="text-primary">+</span>
            </span>
          </Link>
        </div>

        <div className="bg-brand-card border border-brand-border rounded-2xl p-8">
          <h1 className="font-title text-4xl text-white mb-1 tracking-wide">INICIAR SESIÓN</h1>
          <p className="text-brand-muted text-sm font-body mb-6">Accede a tu cuenta para gestionar tus sorteos.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" placeholder="tu@correo.com" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input id="password" type={verPassword ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password" className="pr-10" {...register('password')} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white transition-colors cursor-pointer" onClick={() => setVerPassword(!verPassword)} aria-label={verPassword ? 'Ocultar' : 'Mostrar'}>
                  {verPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={cargando}>
              {cargando ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Ingresando...</> : 'Ingresar'}
            </Button>
          </form>

          <p className="text-center text-sm text-brand-muted font-body mt-6">
            ¿No tienes cuenta?{' '}
            <Link href="/registro" className="text-primary hover:underline font-semibold">Regístrate gratis</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
