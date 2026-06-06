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
  nombre:    z.string().min(2, 'Mínimo 2 caracteres'),
  apellidos: z.string().min(2, 'Requerido'),
  telefono:  z.string().length(10, '10 dígitos sin código de país'),
  email:     z.string().email('Correo inválido'),
  password:  z.string().min(8, 'Mínimo 8 caracteres'),
  confirm:   z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm'],
})

type RegistroForm = z.infer<typeof schema>

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
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.55)',
  letterSpacing: '0.04em',
  display: 'block',
  marginBottom: 7,
}

const errorStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#F87171',
  marginTop: 4,
}

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
      id:        authData.user.id,
      nombre:    data.nombre,
      apellidos: data.apellidos,
      telefono:  `52${data.telefono}`,
      rol:       'usuario',
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
    <div
      style={{
        minHeight: '100vh',
        background: '#1c1c1c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 460 }}>

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
            CREAR CUENTA
          </h1>
          <p className="font-body" style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 28 }}>
            Únete y empieza a organizar sorteos hoy mismo.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Nombre + Apellidos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="font-ui" style={labelStyle}>NOMBRE(S)</label>
                <input placeholder="Tu nombre" style={inputStyle} {...register('nombre')} />
                {errors.nombre && <p className="font-body" style={errorStyle}>{errors.nombre.message}</p>}
              </div>
              <div>
                <label className="font-ui" style={labelStyle}>APELLIDOS</label>
                <input placeholder="Apellidos" style={inputStyle} {...register('apellidos')} />
                {errors.apellidos && <p className="font-body" style={errorStyle}>{errors.apellidos.message}</p>}
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="font-ui" style={labelStyle}>TELÉFONO WHATSAPP</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <span
                  className="font-ui"
                  style={{
                    display: 'flex', alignItems: 'center', padding: '0 12px',
                    background: '#161616',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    fontSize: 13, color: 'rgba(255,255,255,0.4)',
                    flexShrink: 0,
                    userSelect: 'none',
                  }}
                >
                  +52
                </span>
                <input
                  placeholder="10 dígitos"
                  maxLength={10}
                  style={{ ...inputStyle }}
                  {...register('telefono')}
                />
              </div>
              {errors.telefono && <p className="font-body" style={errorStyle}>{errors.telefono.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="font-ui" style={labelStyle}>CORREO ELECTRÓNICO</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                style={inputStyle}
                {...register('email')}
              />
              {errors.email && <p className="font-body" style={errorStyle}>{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="font-ui" style={labelStyle}>CONTRASEÑA</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={verPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
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
              {errors.password && <p className="font-body" style={errorStyle}>{errors.password.message}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label className="font-ui" style={labelStyle}>CONFIRMAR CONTRASEÑA</label>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                style={inputStyle}
                {...register('confirm')}
              />
              {errors.confirm && <p className="font-body" style={errorStyle}>{errors.confirm.message}</p>}
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
                marginTop: 6,
              }}
            >
              {cargando
                ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> Creando cuenta...</>
                : 'Crear Cuenta Gratis'}
            </button>

          </form>

          <p className="font-body" style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 24 }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" style={{ color: '#22C55E', fontWeight: 600, textDecoration: 'none' }}>
              Inicia sesión
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
