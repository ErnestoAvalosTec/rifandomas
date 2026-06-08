'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { X, Cookie } from 'lucide-react'

const STORAGE_KEY = 'rifandomas-cookies'

export function CookieConsent() {
  const pathname = usePathname()
  const [show, setShow] = useState(false)
  const [entered, setEntered] = useState(false)

  const isLegal =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/terminos') ||
    pathname.startsWith('/privacidad')

  useEffect(() => {
    if (isLegal) return
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      const t = setTimeout(() => setShow(true), 1200)
      return () => clearTimeout(t)
    }
  }, [isLegal])

  useEffect(() => {
    if (show) requestAnimationFrame(() => setEntered(true))
    else setEntered(false)
  }, [show])

  const accept = (type: 'all' | 'essential') => {
    localStorage.setItem(STORAGE_KEY, type)
    setEntered(false)
    setTimeout(() => setShow(false), 400)
  }

  if (!show || isLegal) return null

  return (
    <div
      role="dialog"
      aria-label="Consentimiento de cookies"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        transition: 'transform 400ms cubic-bezier(0.16,1,0.3,1), opacity 400ms ease',
        transform: entered ? 'translateY(0)' : 'translateY(100%)',
        opacity: entered ? 1 : 0,
      }}
    >
      <div
        style={{
          background: '#1a1a1a',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '16px 20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {/* Ícono + texto */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 260 }}>
            <Cookie
              size={20}
              style={{ color: '#22C55E', flexShrink: 0, marginTop: 2 }}
              aria-hidden="true"
            />
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#d1d5db', margin: 0 }}>
              Usamos cookies esenciales para el funcionamiento de la plataforma (sesión de usuario) y
              cookies de análisis para mejorar la experiencia.{' '}
              <Link
                href="/privacidad"
                style={{ color: '#22C55E', textDecoration: 'underline', whiteSpace: 'nowrap' }}
              >
                Aviso de Privacidad
              </Link>
              {' · '}
              <Link
                href="/terminos"
                style={{ color: '#22C55E', textDecoration: 'underline', whiteSpace: 'nowrap' }}
              >
                Términos y Condiciones
              </Link>
            </p>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => accept('essential')}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent',
                color: '#9ca3af',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                e.currentTarget.style.color = '#9ca3af'
              }}
            >
              Solo esenciales
            </button>

            <button
              onClick={() => accept('all')}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                background: '#22C55E',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                whiteSpace: 'nowrap',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              Aceptar todo
            </button>

            <button
              onClick={() => accept('essential')}
              aria-label="Cerrar aviso de cookies"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                borderRadius: 4,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
