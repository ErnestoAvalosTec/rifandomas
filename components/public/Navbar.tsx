'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import Image from 'next/image'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''
import { Menu, X, User, Ticket, Eye, EyeOff, Loader2, MapPin, Phone, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { SocialIcon, type RedSocial } from '@/components/public/SocialIcon'

export interface TopbarConfig {
  topbar_activo:     boolean
  topbar_ubicacion:  string | null
  topbar_telefono:   string | null
  topbar_correo:     string | null
  topbar_redes:      RedSocial[]
  topbar_bg_color:   string | null
  topbar_text_color: string | null
  topbar_icon_color: string | null
}

const NAV_LINKS = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#sorteos', label: 'Sorteos' },
  { href: '#como-funciona', label: 'Cómo Funciona' },
  { href: '#verificador', label: 'Verificador' },
]

const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type LoginForm = z.infer<typeof loginSchema>

function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const supabase = createClient()
  const router = useRouter()
  const [cargando, setCargando] = useState(false)
  const [verPassword, setVerPassword] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setCargando(true)

    const options = TURNSTILE_SITE_KEY && captchaToken
      ? { options: { captchaToken } }
      : {}

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
      ...options,
    })

    if (error) {
      turnstileRef.current?.reset()
      setCaptchaToken(null)
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

    toast.success('¡Bienvenido!')
    reset()
    onClose()
    router.push(perfilData?.rol === 'admin' ? '/admin' : '/dashboard')
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !cargando) { reset(); setCaptchaToken(null); onClose() } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-title text-3xl">
            MI CUENTA
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="modal-email">Correo electrónico</Label>
            <Input
              id="modal-email"
              type="email"
              placeholder="tu@correo.com"
              autoComplete="email"
              autoFocus
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="modal-password">Contraseña</Label>
            <div className="relative">
              <Input
                id="modal-password"
                type={verPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors cursor-pointer"
                onClick={() => setVerPassword(!verPassword)}
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {verPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>

          {TURNSTILE_SITE_KEY && (
            <Turnstile
              ref={turnstileRef}
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={setCaptchaToken}
              onExpire={() => setCaptchaToken(null)}
            />
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={cargando || (!!TURNSTILE_SITE_KEY && !captchaToken)}
          >
            {cargando
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Ingresando...</>
              : 'Ingresar'}
          </Button>
        </form>

        <p className="text-center text-sm text-brand-muted font-body">
          ¿No tienes cuenta?{' '}
          <Link
            href="/registro"
            className="text-primary hover:underline font-semibold"
            onClick={() => { reset(); onClose() }}
          >
            Regístrate gratis
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  )
}

export function Navbar({ logoUrl, topbar }: { logoUrl?: string | null; topbar?: TopbarConfig | null }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const handleNavClick = (href: string) => {
    setMenuOpen(false)
    const el = document.querySelector(href)
    el?.scrollIntoView({ behavior: 'smooth' })
  }

  const openModal = () => { setMenuOpen(false); setModalOpen(true) }

  return (
    <>
      {/* Top bar */}
      {(topbar?.topbar_activo ?? true) && (
        <div
          className="w-full py-1.5 px-4 text-xs font-ui"
          style={{
            background:   topbar?.topbar_bg_color   ?? '#1c1c1c',
            borderBottom: '1px solid rgba(128,128,128,0.2)',
            color:        topbar?.topbar_text_color  ?? 'rgba(255,255,255,0.7)',
          }}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">

            {/* Left — ubicacion + telefono */}
            <div className="flex items-center gap-4 flex-wrap">
              {(topbar?.topbar_ubicacion || !topbar) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: topbar?.topbar_icon_color ?? 'inherit' }} />
                  {topbar?.topbar_ubicacion ?? 'Mexico · Sorteos 100% verificados'}
                </span>
              )}
              {topbar?.topbar_telefono && (
                <a href={`tel:${topbar.topbar_telefono}`} className="flex items-center gap-1 transition-opacity hover:opacity-70">
                  <Phone className="w-3 h-3 flex-shrink-0" style={{ color: topbar?.topbar_icon_color ?? 'inherit' }} />
                  {topbar.topbar_telefono}
                </a>
              )}
            </div>

            {/* Right — redes + correo */}
            <div className="flex items-center gap-3">
              {(topbar?.topbar_redes ?? []).map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-80" aria-label={r.red}>
                  <SocialIcon red={r.red} />
                </a>
              ))}
              {(topbar?.topbar_correo || !topbar) && (
                <a href={`mailto:${topbar?.topbar_correo ?? 'hola@rifandomas.com'}`}
                  className="flex items-center gap-1 transition-opacity hover:opacity-70">
                  <Mail className="w-3 h-3 flex-shrink-0" style={{ color: topbar?.topbar_icon_color ?? 'inherit' }} />
                  {topbar?.topbar_correo ?? 'hola@rifandomas.com'}
                </a>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Main navbar */}
      <header
        className="sticky top-0 z-40 w-full px-3 sm:px-4 py-2 transition-all duration-300"
        style={{ background: '#1c1c1c' }}
      >
        {/* Rounded nav card — same width as hero content */}
        <div
          className={cn(
            'max-w-7xl mx-auto transition-shadow duration-300',
            scrolled ? 'shadow-xl' : 'shadow-md'
          )}
          style={{ background: '#ffffff', borderRadius: 10, overflow: 'hidden' }}
        >
          <nav className="px-4 sm:px-6 h-14 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group" aria-label="Inicio">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt="Logo"
                  width={160}
                  height={48}
                  className="object-contain max-h-9 w-auto"
                  unoptimized
                />
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <Ticket className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-title text-2xl text-brand-text group-hover:text-primary transition-colors duration-200">
                    RIFANDO<span className="text-brand-red">MAS</span>
                  </span>
                </>
              )}
            </Link>

            {/* Desktop links */}
            <ul className="hidden md:flex items-center gap-1" role="navigation">
              {NAV_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <button
                    onClick={() => handleNavClick(href)}
                    className="px-4 py-2 text-sm font-ui font-medium text-brand-muted hover:text-brand-text transition-colors duration-200 rounded-lg hover:bg-brand-card cursor-pointer"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={openModal} className="gap-1.5">
                <User className="w-4 h-4" />
                Mi Cuenta
              </Button>
            </div>

            {/* Hamburger */}
            <button
              className="md:hidden p-2 rounded-lg transition-colors duration-200 cursor-pointer"
              style={{ color: '#6B7280' }}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
            >
              <Menu className="w-5 h-5" />
            </button>
          </nav>
        </div>
      </header>

      {/* Right-side mobile drawer */}
      {/* Overlay */}
      <div
        className={cn(
          'md:hidden fixed inset-0 z-50 transition-opacity duration-300',
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        style={{ background: 'rgba(0,0,0,0.65)' }}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'md:hidden fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-in-out',
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ width: 270, background: '#252525', borderLeft: '1px solid #3a3a3a' }}
      >
        {/* Header del drawer */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #3a3a3a' }}>
          {logoUrl ? (
            <Image src={logoUrl} alt="Logo" width={120} height={36} className="object-contain max-h-8 w-auto" unoptimized />
          ) : (
            <span className="font-title text-xl text-white">RIFANDO<span style={{ color: '#DC2626' }}>MAS</span></span>
          )}
          <button
            onClick={() => setMenuOpen(false)}
            className="p-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ color: '#9ca3af' }}
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Links */}
        <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
          {NAV_LINKS.map(({ href, label }) => (
            <button
              key={href}
              onClick={() => handleNavClick(href)}
              className="text-left px-4 py-3 rounded-xl text-sm font-ui font-medium transition-colors duration-150 cursor-pointer"
              style={{ color: '#d1d5db' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#3a3a3a'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#d1d5db' }}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* CTA */}
        <div className="px-4 pb-8 pt-3" style={{ borderTop: '1px solid #3a3a3a' }}>
          <button
            onClick={openModal}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-ui font-semibold text-sm text-white transition-opacity cursor-pointer"
            style={{ background: '#22C55E' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            <User className="w-4 h-4" />
            Mi Cuenta
          </button>
        </div>
      </div>

      {/* Login modal — self-contained */}
      <LoginModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
