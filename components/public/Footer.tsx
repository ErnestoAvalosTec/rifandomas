import Link from 'next/link'
import { Ticket } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-brand-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Ticket className="w-4 h-4 text-white" />
              </div>
              <span className="font-title text-xl text-white">
                RIFANDO<span className="text-brand-red">MAS</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm font-body leading-relaxed">
              La plataforma de sorteos y rifas virtuales más confiable de México.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-ui font-semibold text-white text-sm mb-3">Plataforma</h4>
            <ul className="space-y-2 text-sm text-gray-400 font-body">
              <li><Link href="#sorteos" className="hover:text-primary transition-colors">Sorteos activos</Link></li>
              <li><Link href="#como-funciona" className="hover:text-primary transition-colors">Cómo funciona</Link></li>
              <li><Link href="#verificador" className="hover:text-primary transition-colors">Verificador de boletos</Link></li>
              <li><Link href="/login" className="hover:text-primary transition-colors">Mi cuenta</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-ui font-semibold text-white text-sm mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-400 font-body">
              <li><Link href="/aviso-privacidad" className="hover:text-primary transition-colors">Aviso de Privacidad</Link></li>
              <li><Link href="/terminos" className="hover:text-primary transition-colors">Términos y Condiciones</Link></li>
              <li><span>hola@rifandomas.com</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500 font-ui">
            © {new Date().getFullYear()} RifandoMas. Todos los derechos reservados.
          </p>
          <p className="text-xs text-gray-500 font-ui">
            Hecho con ❤️ en México 🇲🇽
          </p>
        </div>
      </div>
    </footer>
  )
}
