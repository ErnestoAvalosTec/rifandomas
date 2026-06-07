'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, Trash2, Save, Lock, CreditCard, Camera } from 'lucide-react'

const perfilSchema = z.object({
  nombre:    z.string().min(2),
  apellidos: z.string().min(2),
  telefono:  z.string().optional(),
  redSocial: z.string().optional(),
})

const passwordSchema = z.object({
  nueva:     z.string().min(8, 'Mínimo 8 caracteres'),
  confirmar: z.string(),
}).refine((d) => d.nueva === d.confirmar, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmar'],
})

type PerfilForm    = z.infer<typeof perfilSchema>
type PasswordForm  = z.infer<typeof passwordSchema>

interface Cuenta {
  id?: string
  banco: string
  clabe: string
  titular: string
  activo: boolean
}

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
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.5)',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  marginBottom: 6,
}

const cardStyle: React.CSSProperties = {
  background: '#252525',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 16,
  padding: '24px',
}

const btnPrimary: React.CSSProperties = {
  width: '100%',
  padding: '11px 0',
  background: '#22C55E',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  transition: 'background 0.15s',
  marginTop: 4,
}

const btnOutline: React.CSSProperties = {
  width: '100%',
  padding: '11px 0',
  background: 'transparent',
  color: 'rgba(255,255,255,0.7)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  transition: 'all 0.15s',
  marginTop: 4,
}

export default function ConfiguracionPage() {
  const supabase = createClient()
  const sb = supabase as any
  const [cargando, setCargando]       = useState(false)
  const [guardandoPass, setGuardandoPass] = useState(false)
  const [cuentas, setCuentas]         = useState<Cuenta[]>([])
  const [userId, setUserId]           = useState<string>('')
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null)
  const [subiendoAvatar, setSubiendoAvatar] = useState(false)

  const perfilForm = useForm<PerfilForm>({ resolver: zodResolver(perfilSchema) })
  const passForm   = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: perfil } = await sb.from('perfiles').select('*').eq('id', user.id).single()
      if (perfil) {
        perfilForm.reset({
          nombre:    perfil.nombre,
          apellidos: perfil.apellidos,
          telefono:  perfil.telefono ?? '',
          redSocial: perfil.red_social_verificacion ?? '',
        })
        setAvatarUrl(perfil.avatar_url ?? null)
      }
      const { data: cuentasDB } = await sb.from('cuentas_deposito').select('*').eq('usuario_id', user.id)
      if (cuentasDB) setCuentas(cuentasDB)
    }
    cargar()
  }, [])

  const subirAvatar = async (file: File) => {
    if (!userId) return
    setSubiendoAvatar(true)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('avatares').upload(path, file, { upsert: true, contentType: file.type })
    if (error) {
      toast.error('Error al subir la foto')
      setSubiendoAvatar(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('avatares').getPublicUrl(data.path)
    const url = `${publicUrl}?v=${Date.now()}`
    const { error: dbError } = await sb.from('perfiles').update({ avatar_url: url }).eq('id', userId)
    setSubiendoAvatar(false)
    if (dbError) { toast.error('No se pudo guardar la foto'); return }
    setAvatarUrl(url)
    toast.success('Foto de perfil actualizada')
  }

  const guardarPerfil = async (data: PerfilForm) => {
    setCargando(true)
    const { redSocial, ...resto } = data
    const { error } = await sb.from('perfiles').update({ ...resto, red_social_verificacion: redSocial?.trim() || null }).eq('id', userId)
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

  const agregarCuenta  = () => setCuentas([...cuentas, { banco: '', clabe: '', titular: '', activo: true }])
  const eliminarCuenta = (i: number) => setCuentas(cuentas.filter((_, idx) => idx !== i))
  const updateCuenta   = (i: number, field: keyof Cuenta, val: string) =>
    setCuentas(cuentas.map((c, idx) => idx === i ? { ...c, [field]: val } : c))

  const errStyle: React.CSSProperties = { fontSize: 11, color: '#F87171', marginTop: 4 }

  return (
    <div className="max-w-2xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div>
        <h1 className="font-title" style={{ fontSize: 32, color: '#fff', letterSpacing: '0.06em' }}>CONFIGURACIÓN</h1>
        <p className="font-body" style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
          Administra tu cuenta y cuentas de depósito.
        </p>
      </div>

      {/* Datos personales */}
      <div style={cardStyle}>
        <h2 className="font-ui" style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Save style={{ width: 16, height: 16, color: '#22C55E' }} />
          Datos personales
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Foto de perfil"
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            ) : (
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#22C55E', fontWeight: 700, fontSize: 20,
              }}>
                <Camera style={{ width: 22, height: 22 }} />
              </div>
            )}
            <label
              htmlFor="avatar-input"
              style={{
                position: 'absolute', bottom: -2, right: -2, width: 26, height: 26, borderRadius: '50%',
                background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', border: '2px solid #252525',
              }}
              title="Cambiar foto de perfil"
            >
              {subiendoAvatar ? <Loader2 style={{ width: 12, height: 12, color: '#fff' }} className="animate-spin" /> : <Camera style={{ width: 12, height: 12, color: '#fff' }} />}
            </label>
            <input
              id="avatar-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              disabled={subiendoAvatar}
              onChange={(e) => { const file = e.target.files?.[0]; if (file) subirAvatar(file); e.target.value = '' }}
            />
          </div>
          <div>
            <p className="font-ui text-white" style={{ fontSize: 13, fontWeight: 600 }}>Foto de perfil</p>
            <p className="font-body" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              Visible para los participantes en tus sorteos.
            </p>
          </div>
        </div>

        <form onSubmit={perfilForm.handleSubmit(guardarPerfil)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="font-ui" style={labelStyle}>Nombre(s)</label>
              <input style={inputStyle} {...perfilForm.register('nombre')} />
              {perfilForm.formState.errors.nombre && <p style={errStyle}>{perfilForm.formState.errors.nombre.message}</p>}
            </div>
            <div>
              <label className="font-ui" style={labelStyle}>Apellidos</label>
              <input style={inputStyle} {...perfilForm.register('apellidos')} />
              {perfilForm.formState.errors.apellidos && <p style={errStyle}>{perfilForm.formState.errors.apellidos.message}</p>}
            </div>
          </div>
          <div>
            <label className="font-ui" style={labelStyle}>Teléfono WhatsApp</label>
            <input placeholder="10 dígitos" style={inputStyle} {...perfilForm.register('telefono')} />
          </div>
          <div>
            <label className="font-ui" style={labelStyle}>Red social (para verificación)</label>
            <input placeholder="@usuario o enlace de Instagram, Facebook, TikTok..." style={inputStyle} {...perfilForm.register('redSocial')} />
            <p className="font-body" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6, lineHeight: 1.5 }}>
              Compártela con nuestro equipo para verificar tu cuenta y mostrar la insignia de "Perfil verificado".
            </p>
          </div>
          <button type="submit" disabled={cargando} className="font-ui" style={btnPrimary}>
            {cargando ? <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> : <Save style={{ width: 15, height: 15 }} />}
            {cargando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      {/* Cambiar contraseña */}
      <div style={cardStyle}>
        <h2 className="font-ui" style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lock style={{ width: 16, height: 16, color: '#22C55E' }} />
          Cambiar contraseña
        </h2>
        <form onSubmit={passForm.handleSubmit(cambiarPassword)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="font-ui" style={labelStyle}>Nueva contraseña</label>
            <input type="password" style={inputStyle} {...passForm.register('nueva')} />
            {passForm.formState.errors.nueva && <p style={errStyle}>{passForm.formState.errors.nueva.message}</p>}
          </div>
          <div>
            <label className="font-ui" style={labelStyle}>Confirmar contraseña</label>
            <input type="password" style={inputStyle} {...passForm.register('confirmar')} />
            {passForm.formState.errors.confirmar && <p style={errStyle}>{passForm.formState.errors.confirmar.message}</p>}
          </div>
          <button type="submit" disabled={guardandoPass} className="font-ui" style={btnOutline}>
            {guardandoPass ? <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> : <Lock style={{ width: 15, height: 15 }} />}
            {guardandoPass ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>

      {/* Cuentas de depósito */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="font-ui" style={{ fontSize: 15, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard style={{ width: 16, height: 16, color: '#22C55E' }} />
            Cuentas de depósito
          </h2>
          <button
            type="button"
            onClick={agregarCuenta}
            className="font-ui"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus style={{ width: 13, height: 13 }} />
            Agregar
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cuentas.map((c, i) => (
            <div key={i} style={{
              background: '#1c1c1c',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12,
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="font-ui" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Cuenta {i + 1}</span>
                <button
                  type="button"
                  onClick={() => eliminarCuenta(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', lineHeight: 0 }}
                >
                  <Trash2 style={{ width: 15, height: 15 }} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input
                  placeholder="Banco"
                  value={c.banco}
                  onChange={(e) => updateCuenta(i, 'banco', e.target.value)}
                  style={inputStyle}
                />
                <input
                  placeholder="Titular"
                  value={c.titular}
                  onChange={(e) => updateCuenta(i, 'titular', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <input
                placeholder="CLABE (18 dígitos)"
                maxLength={18}
                value={c.clabe}
                onChange={(e) => updateCuenta(i, 'clabe', e.target.value)}
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        {cuentas.length > 0 && (
          <button onClick={guardarCuentas} className="font-ui" style={{ ...btnPrimary, marginTop: 16 }}>
            <Save style={{ width: 15, height: 15 }} />
            Guardar cuentas
          </button>
        )}

        {cuentas.length === 0 && (
          <p className="font-body" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '16px 0' }}>
            No tienes cuentas registradas. Agrégalas para que los clientes puedan depositarte.
          </p>
        )}
      </div>

    </div>
  )
}
