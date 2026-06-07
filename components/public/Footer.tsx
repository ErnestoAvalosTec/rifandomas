import Link from 'next/link'
import Image from 'next/image'
import { Ticket, Phone, Mail } from 'lucide-react'
import { SocialIcon, type RedSocial } from '@/components/public/SocialIcon'

interface FooterLink { label: string; url: string }

export interface FooterConfig {
  footer_bg_color:   string | null
  footer_text_color: string | null
  footer_texto:      string | null
  footer_telefono:   string | null
  footer_correo:     string | null
  footer_redes:      RedSocial[]
  footer_links:      FooterLink[]
}

const PLATAFORMA_LINKS = [
  { href: '#sorteos',       label: 'Sorteos activos' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#verificador',   label: 'Verificador de boletos' },
  { href: '/login',         label: 'Mi cuenta' },
]

export function Footer({ logoUrl, footer }: { logoUrl?: string | null; footer?: FooterConfig | null }) {
  const bg     = footer?.footer_bg_color   ?? '#1c1c1c'
  const text   = footer?.footer_text_color ?? '#9ca3af'
  const redes  = footer?.footer_redes ?? []
  const links  = footer?.footer_links ?? []
  const correo = footer?.footer_correo ?? 'hola@rifandomas.com'

  return (
    <footer style={{ background: bg, color: text, borderTop: '1px solid rgba(128,128,128,0.15)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-3" aria-label="Inicio">
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
                  <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                    <Ticket className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-title text-xl text-white">
                    RIFANDO<span className="text-brand-red">MAS</span>
                  </span>
                </>
              )}
            </Link>
            <p className="text-sm font-body leading-relaxed max-w-sm" style={{ color: text }}>
              {footer?.footer_texto || 'La plataforma de sorteos y rifas virtuales más confiable de México.'}
            </p>
            {redes.length > 0 && (
              <div className="flex items-center gap-3 mt-4">
                {redes.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-70"
                    style={{ background: 'rgba(128,128,128,0.12)' }}
                    aria-label={r.red}
                  >
                    <SocialIcon red={r.red} className="w-4 h-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Plataforma */}
          <div>
            <h4 className="font-ui font-semibold text-white text-sm mb-3">Plataforma</h4>
            <ul className="space-y-2 text-sm font-body">
              {PLATAFORMA_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-primary transition-colors" style={{ color: text }}>
                    {label}
                  </Link>
                </li>
              ))}
              {links.map((l, i) => (
                <li key={i}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors" style={{ color: text }}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="font-ui font-semibold text-white text-sm mb-3">Contacto</h4>
            <ul className="space-y-2 text-sm font-body">
              {footer?.footer_telefono && (
                <li>
                  <a href={`tel:${footer.footer_telefono}`} className="flex items-center gap-1.5 hover:text-primary transition-colors" style={{ color: text }}>
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" /> {footer.footer_telefono}
                  </a>
                </li>
              )}
              <li>
                <a href={`mailto:${correo}`} className="flex items-center gap-1.5 hover:text-primary transition-colors" style={{ color: text }}>
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" /> {correo}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-2" style={{ borderColor: 'rgba(128,128,128,0.15)' }}>
          <p className="text-xs font-ui" style={{ color: text, opacity: 0.7 }}>
            © {new Date().getFullYear()} RifandoMas. Todos los derechos reservados.
          </p>
          <p className="text-xs font-ui" style={{ color: text, opacity: 0.7 }}>
            Hecho con ❤️ en México 🇲🇽
          </p>
        </div>
      </div>
    </footer>
  )
}
