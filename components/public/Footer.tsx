import Link from 'next/link'
import { Ticket } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-brand-card border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Ticket className="w-4 h-4 text-white" />
              </div>
              <span className="font-title text-xl tracking-wider text-white">
                RIFANDO<span className="text-primary">+</span>
              </span>
            </div>
            <p className="text-brand-muted text-sm font-body leading-relaxed">
              La plataforma de sorteos y rifas virtuales más confiable de México.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-ui font-semibold text-white text-sm mb-3">Plataforma</h4>
            <ul className="space-y-2 text-sm text-brand-muted font-body">
              <li><Link href="#sorteos" className="hover:text-white transition-colors">Sorteos activos</Link></li>
              <li><Link href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</Link></li>
              <li><Link href="#verificador" className="hover:text-white transition-colors">Verificador de boletos</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Mi cuenta</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-ui font-semibold text-white text-sm mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-brand-muted font-body">
              <li><Link href="/aviso-privacidad" className="hover:text-white transition-colors">Aviso de Privacidad</Link></li>
              <li><Link href="/terminos" className="hover:text-white transition-colors">Términos y Condiciones</Link></li>
              <li><span>contacto@rifandoplus.mx</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-brand-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-brand-muted font-ui">
            © {new Date().getFullYear()} Rifando+. Todos los derechos reservados.
          </p>
          <p className="text-xs text-brand-muted font-ui">
            Hecho con ❤️ en México 🇲🇽
          </p>
        </div>
      </div>
    </footer>
  )
}
