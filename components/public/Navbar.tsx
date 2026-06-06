'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import Image from 'next/image'
import { Menu, X, User, Ticket, Eye, EyeOff, Loader2, MapPin, Phone, Mail, Facebook, Instagram, Twitter, Youtube, Linkedin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface RedSocial { red: string; url: string }

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

const SOCIAL_COLORS: Record<string, string> = {
  facebook:  '#1877F2',
  instagram: '#E1306C',
  twitter:   '#1DA1F2',
  youtube:   '#FF0000',
  linkedin:  '#0A66C2',
  tiktok:    '#ff2d55',
  whatsapp:  '#25D366',
}

function SocialIcon({ red }: { red: string }) {
  const cls   = 'w-3.5 h-3.5'
  const color = SOCIAL_COLORS[red] ?? 'currentColor'
  switch (red) {
    case 'facebook':  return <Facebook  className={cls} style={{ color }} />
    case 'instagram': return <Instagram className={cls} style={{ color }} />
    case 'twitter':   return <Twitter   className={cls} style={{ color }} />
    case 'youtube':   return <Youtube   className={cls} style={{ color }} />
    case 'linkedin':  return <Linkedin  className={cls} style={{ color }} />
    case 'tiktok':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill={color}>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
        </svg>
      )
    case 'whatsapp':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill={color}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
        </svg>
      )
    default: return null
  }
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

  const { register, handleSubmit, formState: { errors }, reset } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
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

    toast.success('¡Bienvenido!')
    reset()
    onClose()
    router.push(perfilData?.rol === 'admin' ? '/admin' : '/dashboard')
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !cargando) { reset(); onClose() } }}>
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

          <Button type="submit" size="lg" className="w-full" disabled={cargando}>
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
              className="md:hidden p-2 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-card transition-colors duration-200 cursor-pointer"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </nav>

          {/* Mobile drawer — inside rounded card */}
          <div
            className={cn(
              'md:hidden overflow-hidden transition-all duration-300 border-t border-brand-border',
              menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            <div className="bg-white px-4 py-4 flex flex-col gap-1">
              {NAV_LINKS.map(({ href, label }) => (
                <button
                  key={href}
                  onClick={() => handleNavClick(href)}
                  className="text-left px-4 py-3 text-sm font-ui font-medium text-brand-muted hover:text-brand-text hover:bg-brand-card rounded-lg transition-colors duration-200 cursor-pointer"
                >
                  {label}
                </button>
              ))}
              <div className="pt-2 border-t border-brand-border mt-1">
                <Button variant="default" size="sm" onClick={openModal} className="w-full gap-1.5">
                  <User className="w-4 h-4" />
                  Mi Cuenta
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Login modal — self-contained */}
      <LoginModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
