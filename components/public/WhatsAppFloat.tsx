'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'

const WA_URL = 'https://wa.me/523312836356'

const MESSAGES = [
  '¿En qué te podemos ayudar? 😊',
  '¿Tienes alguna duda sobre algún sorteo?',
  '¡Hola! Estamos aquí para ayudarte 👋',
  '¿Quieres saber cómo participar?',
  '¿Buscas un sorteo en especial?',
  'Escríbenos, con gusto te atendemos',
  '¿Necesitas ayuda con tu compra?',
]

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  )
}

export function WhatsAppFloat() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [closed, setClosed] = useState(false)
  const [entered, setEntered] = useState(false)
  const [message] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)])

  const isPublic =
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/dashboard') &&
    !pathname.startsWith('/login')

  // Aparece 2.5 s después de cargar la página; se oculta solo a los 8 s
  useEffect(() => {
    if (!isPublic || closed) return
    const show = setTimeout(() => setVisible(true), 2500)
    const hide = setTimeout(() => setVisible(false), 10500)
    return () => { clearTimeout(show); clearTimeout(hide) }
  }, [isPublic, closed])

  // Marcar que ya se hizo la entrada para activar la transición CSS
  useEffect(() => {
    if (visible) requestAnimationFrame(() => setEntered(true))
    else setEntered(false)
  }, [visible])

  if (!isPublic) return null

  return (
    <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end gap-3 pointer-events-none">

      {/* ── Globo de diálogo ── */}
      {visible && (
        <div
          className="pointer-events-auto"
          style={{
            transition: 'opacity 350ms ease, transform 350ms ease',
            opacity: entered ? 1 : 0,
            transform: entered ? 'translateY(0)' : 'translateY(10px)',
          }}
        >
          <div
            style={{
              position: 'relative',
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14,
              padding: '10px 14px 10px 12px',
              maxWidth: 240,
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            }}
          >
            {/* Cerrar */}
            <button
              onClick={() => { setVisible(false); setClosed(true) }}
              aria-label="Cerrar"
              style={{
                position: 'absolute', top: 6, right: 6,
                color: 'rgba(255,255,255,0.35)',
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 2, borderRadius: 4,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.8)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)' }}
            >
              <X size={13} />
            </button>

            {/* Texto */}
            <p style={{
              color: '#fff', fontSize: 13, fontWeight: 500,
              lineHeight: 1.45, paddingRight: 14,
              fontFamily: 'var(--font-inter, sans-serif)',
            }}>
              {message}
            </p>

            {/* Flecha apuntando al botón */}
            <div style={{
              position: 'absolute', bottom: -8, right: 22,
              width: 0, height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid rgba(255,255,255,0.12)',
            }} />
            <div style={{
              position: 'absolute', bottom: -7, right: 23,
              width: 0, height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: '7px solid #1a1a1a',
            }} />
          </div>
        </div>
      )}

      {/* ── Botón flotante ── */}
      <a
        href={WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        className="pointer-events-auto"
        onMouseEnter={() => { if (!closed) setVisible(true) }}
        onClick={() => setVisible(false)}
        style={{
          width: 56, height: 56,
          borderRadius: '50%',
          background: '#25D366',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          textDecoration: 'none',
          animation: 'wa-float 3s ease-in-out infinite',
          transition: 'transform 0.15s, box-shadow 0.15s',
          flexShrink: 0,
        }}
        onMouseOver={e => {
          const el = e.currentTarget as HTMLAnchorElement
          el.style.transform = 'scale(1.1)'
          el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.45)'
        }}
        onMouseOut={e => {
          const el = e.currentTarget as HTMLAnchorElement
          el.style.transform = 'scale(1)'
          el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.35)'
        }}
      >
        <WhatsAppIcon />
      </a>

      {/* Animación flotante */}
      <style>{`
        @keyframes wa-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
