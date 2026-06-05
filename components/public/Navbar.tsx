'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, User, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#sorteos', label: 'Sorteos' },
  { href: '#como-funciona', label: 'Cómo Funciona' },
  { href: '#verificador', label: 'Verificador' },
]

interface NavbarProps {
  onLoginClick?: () => void
}

export function Navbar({ onLoginClick }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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

  return (
    <>
      {/* Top bar */}
      <div className="w-full bg-brand-card border-b border-brand-border py-1.5 px-4 text-xs text-brand-muted flex items-center justify-between font-ui">
        <span>📍 México · Sorteos 100% verificados</span>
        <span>contacto@rifandoplus.mx</span>
      </div>

      {/* Main navbar */}
      <header
        className={cn(
          'sticky top-0 z-40 w-full transition-all duration-300',
          scrolled
            ? 'glass border-b border-brand-border shadow-xl'
            : 'bg-brand-bg border-b border-transparent'
        )}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group" aria-label="Rifando+ inicio">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Ticket className="w-4 h-4 text-white" />
            </div>
            <span className="font-title text-2xl tracking-wider text-white group-hover:text-primary transition-colors duration-200">
              RIFANDO<span className="text-primary">+</span>
            </span>
          </Link>

          {/* Desktop links */}
          <ul className="hidden md:flex items-center gap-1" role="navigation">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <button
                  onClick={() => handleNavClick(href)}
                  className="px-4 py-2 text-sm font-ui text-brand-muted hover:text-white transition-colors duration-200 rounded-lg hover:bg-brand-card cursor-pointer"
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onLoginClick} className="gap-1.5">
              <User className="w-4 h-4" />
              Mi Cuenta
            </Button>
          </div>

          {/* Hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-brand-muted hover:text-white hover:bg-brand-card transition-colors duration-200 cursor-pointer"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {/* Mobile drawer */}
        <div
          className={cn(
            'md:hidden overflow-hidden transition-all duration-300 border-t border-brand-border',
            menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="bg-brand-card px-4 py-4 flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <button
                key={href}
                onClick={() => handleNavClick(href)}
                className="text-left px-4 py-3 text-sm font-ui text-brand-muted hover:text-white hover:bg-accent rounded-lg transition-colors duration-200 cursor-pointer"
              >
                {label}
              </button>
            ))}
            <div className="pt-2 border-t border-brand-border mt-1">
              <Button variant="default" size="sm" onClick={() => { setMenuOpen(false); onLoginClick?.() }} className="w-full gap-1.5">
                <User className="w-4 h-4" />
                Mi Cuenta
              </Button>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
