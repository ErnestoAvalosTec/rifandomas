'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, MessageSquare, Send, X } from 'lucide-react'

interface Pregunta {
  id: string
  nombre_autor: string
  pregunta: string
  respuesta: string | null
  created_at: string
  respondida_at: string | null
}

const PSEUDONIMOS = [
  'Participante Curioso', 'Visitante Animado', 'Ganador Esperanzado',
  'Jugador Entusiasta', 'Comprador Activo', 'Fan del Sorteo',
  'Apostador Valiente', 'Visitante Interesado', 'Participante Emocionado',
  'Usuario Activo', 'Comprador Potencial', 'Participante Entusiasta',
]

const PREVIEW_COUNT = 3

export function SeccionPreguntas({ sorteoId, soloLectura = false }: { sorteoId: string; soloLectura?: boolean }) {
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [cargando, setCargando] = useState(true)
  const [expandido, setExpandido] = useState(false)
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
  const [formAbierto, setFormAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmacion, setConfirmacion] = useState(false)

  useEffect(() => {
    fetch(`/api/preguntas?sorteo_id=${sorteoId}`)
      .then(r => r.json())
      .then(data => { setPreguntas(Array.isArray(data) ? data : []); setCargando(false) })
      .catch(() => setCargando(false))
  }, [sorteoId])

  const toggleItem = (id: string) =>
    setAbiertos(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!texto.trim() || enviando) return
    setEnviando(true)

    const nombreFinal = nombre.trim() ||
      PSEUDONIMOS[Math.floor(Math.random() * PSEUDONIMOS.length)]

    const res = await fetch('/api/preguntas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sorteo_id: sorteoId, nombre_autor: nombreFinal, pregunta: texto.trim() }),
    })

    setEnviando(false)
    if (res.ok) {
      setConfirmacion(true)
      setTexto('')
      setNombre('')
      setTimeout(() => { setConfirmacion(false); setFormAbierto(false) }, 3500)
    }
  }

  const hayMas = preguntas.length > PREVIEW_COUNT
  const visibles = expandido ? preguntas : preguntas.slice(0, PREVIEW_COUNT)

  /* ─── Input / textarea shared style ─── */
  const inputBase: React.CSSProperties = {
    width: '100%',
    background: '#141414',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 16,
    color: '#fff',
    outline: 'none',
    marginTop: 6,
    fontFamily: 'inherit',
  }

  return (
    <div
      className="max-w-2xl mx-auto px-4 mt-14"
      style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 48 }}
    >
      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <h2
          className="font-title text-white"
          style={{ fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', letterSpacing: '0.05em' }}
        >
          PREGUNTAS
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 15, marginTop: 3 }}>
          {cargando
            ? 'Cargando...'
            : preguntas.length === 0
            ? 'Sé el primero en preguntar'
            : `${preguntas.length} ${preguntas.length === 1 ? 'respuesta publicada' : 'respuestas publicadas'}`}
        </p>
      </div>

      {!soloLectura && (
        <>
          {/* ── CTA Preguntar ── */}
          <button
        onClick={() => { setFormAbierto(v => !v); setConfirmacion(false) }}
        style={{
          width: '100%',
          padding: '13px 0',
          background: formAbierto ? '#1e1e1e' : '#191919',
          border: `1px solid ${formAbierto ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.1)'}`,
          borderBottom: formAbierto ? 'none' : undefined,
          borderRadius: formAbierto ? '12px 12px 0 0' : 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          color: '#fff',
          fontSize: 17,
          fontWeight: 600,
          transition: 'border-color 0.15s, background 0.15s',
          marginBottom: formAbierto ? 0 : 18,
        }}
      >
        <MessageSquare style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.55)' }} />
        Hacer una pregunta
      </button>

      {/* ── Formulario inline ── */}
      {formAbierto && (
        <div
          style={{
            background: '#1e1e1e',
            border: '1px solid rgba(255,255,255,0.1)',
            borderTop: 'none',
            borderRadius: '0 0 12px 12px',
            padding: '18px 18px 20px',
            marginBottom: 18,
          }}
        >
          {confirmacion ? (
            <div style={{ textAlign: 'center', padding: '14px 0' }}>
              <p style={{ color: '#0C9646', fontWeight: 700, fontSize: 17 }}>Pregunta enviada</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, marginTop: 5 }}>
                El organizador la revisará y decidirá si publicarla.
              </p>
            </div>
          ) : (
            <form onSubmit={handleEnviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Tu nombre (opcional)
                </label>
                <input
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Si lo omites, usamos un seudónimo automático"
                  maxLength={50}
                  style={inputBase}
                />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Tu pregunta *
                </label>
                <textarea
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  placeholder="¿Qué quieres saber sobre este sorteo?"
                  required
                  maxLength={400}
                  rows={3}
                  style={{ ...inputBase, resize: 'vertical' }}
                />
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', marginTop: 4, textAlign: 'right' }}>
                  {texto.length}/400
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="submit"
                  disabled={!texto.trim() || enviando}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    background: (!texto.trim() || enviando) ? 'rgba(12, 150, 70,0.35)' : '#0C9646',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: 8,
                    cursor: (!texto.trim() || enviando) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    transition: 'background 0.15s',
                  }}
                >
                  <Send style={{ width: 13, height: 13 }} />
                  {enviando ? 'Enviando...' : 'Enviar pregunta'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormAbierto(false)}
                  style={{
                    width: 40,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.45)',
                  }}
                  aria-label="Cancelar"
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </form>
          )}
        </div>
      )}
        </>
      )}

      {/* ── Lista Q&A ── */}
      {!cargando && preguntas.length > 0 && (
        <div style={{ position: 'relative' }}>
          {/* Gradient blur cuando hay más y está colapsado */}
          <div
            style={
              hayMas && !expandido
                ? {
                    maskImage: 'linear-gradient(to bottom, black 52%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 52%, transparent 100%)',
                  }
                : {}
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {visibles.map((p) => {
                const open = abiertos.has(p.id)
                return (
                  <div
                    key={p.id}
                    style={{
                      background: '#1c1c1c',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Fila pregunta */}
                    <button
                      onClick={() => toggleItem(p.id)}
                      style={{
                        width: '100%',
                        padding: '13px 16px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        textAlign: 'left',
                      }}
                    >
                      <ChevronDown
                        style={{
                          width: 15,
                          height: 15,
                          flexShrink: 0,
                          marginTop: 3,
                          color: 'rgba(255,255,255,0.35)',
                          transition: 'transform 0.2s ease',
                          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#fff', fontSize: 17, fontWeight: 500, lineHeight: 1.45 }}>
                          {p.pregunta}
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 14, marginTop: 4 }}>
                          {p.nombre_autor}
                        </p>
                      </div>
                    </button>

                    {/* Respuesta expandida */}
                    {open && p.respuesta && (
                      <div
                        style={{
                          padding: '0 16px 14px 43px',
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div style={{ paddingTop: 12 }}>
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: '#0C9646',
                              marginBottom: 7,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                            }}
                          >
                            Respuesta del organizador
                          </p>
                          <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 16, lineHeight: 1.6 }}>
                            {p.respuesta}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Botón "Ver todas" */}
          {hayMas && !expandido && (
            <div style={{ marginTop: 14, textAlign: 'left', paddingLeft: 2 }}>
              <button
                onClick={() => setExpandido(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 16,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: 0,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
              >
                Ver todas las preguntas
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
