'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Ticket, Loader2, Eye, EyeOff } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type LoginForm = z.infer<typeof schema>

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#161616',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 14,
  color: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
}

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
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        toast.error('Confirma tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.')
      } else {
        toast.error('Correo o contraseña incorrectos.')
      }
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
    <div
      style={{
        minHeight: '100vh',
        background: '#1c1c1c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: '#22C55E',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Ticket style={{ width: 20, height: 20, color: '#fff' }} />
            </div>
            <span className="font-title" style={{ fontSize: 28, letterSpacing: '0.08em', color: '#fff' }}>
              RIFANDO<span style={{ color: '#22C55E' }}>+</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div style={{
          background: '#252525',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '36px 32px',
        }}>
          <h1 className="font-title" style={{ fontSize: 28, color: '#fff', letterSpacing: '0.06em', marginBottom: 6 }}>
            INICIAR SESIÓN
          </h1>
          <p className="font-body" style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 28 }}>
            Accede a tu cuenta para gestionar tus sorteos.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <label className="font-ui" style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>
                CORREO ELECTRÓNICO
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                style={inputStyle}
                {...register('email')}
              />
              {errors.email && (
                <p className="font-body" style={{ fontSize: 11, color: '#F87171' }}>{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <label className="font-ui" style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>
                CONTRASEÑA
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={verPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: 42 }}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setVerPassword(!verPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0,
                    color: 'rgba(255,255,255,0.35)',
                  }}
                  aria-label={verPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {verPassword
                    ? <EyeOff style={{ width: 16, height: 16 }} />
                    : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
              {errors.password && (
                <p className="font-body" style={{ fontSize: 11, color: '#F87171' }}>{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={cargando}
              className="font-ui"
              style={{
                width: '100%',
                padding: '12px 0',
                background: cargando ? 'rgba(34,197,94,0.6)' : '#22C55E',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: cargando ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.15s',
                marginTop: 4,
              }}
            >
              {cargando
                ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> Ingresando...</>
                : 'Ingresar'}
            </button>

          </form>

          <p className="font-body" style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 24 }}>
            ¿No tienes cuenta?{' '}
            <Link href="/registro" style={{ color: '#22C55E', fontWeight: 600, textDecoration: 'none' }}>
              Regístrate gratis
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
