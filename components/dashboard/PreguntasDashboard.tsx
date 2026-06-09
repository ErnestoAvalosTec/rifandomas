'use client'

import { useState } from 'react'
import { MessageSquare, Send, Trash2, ChevronDown, CheckCircle2 } from 'lucide-react'

interface PreguntaRaw {
  id: string
  sorteo_id: string
  nombre_autor: string
  pregunta: string
  respuesta: string | null
  estado: 'pendiente' | 'publicada'
  created_at: string
  sorteos?: { id: string; nombre: string }
}

interface PreguntasDashboardProps {
  preguntasIniciales: PreguntaRaw[]
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function PreguntasDashboard({ preguntasIniciales }: PreguntasDashboardProps) {
  const [preguntas, setPreguntas] = useState<PreguntaRaw[]>(preguntasIniciales)
  const [respuestas, setRespuestas] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  const pendientes = preguntas.filter(p => p.estado === 'pendiente')
  const publicadas = preguntas.filter(p => p.estado === 'publicada')

  const toggleExpandido = (id: string) =>
    setExpandidos(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleResponder = async (p: PreguntaRaw) => {
    const respuesta = respuestas[p.id]?.trim()
    if (!respuesta || enviando) return
    setEnviando(p.id)
    const res = await fetch(`/api/dashboard/preguntas/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ respuesta }),
    })
    setEnviando(null)
    if (res.ok) {
      const updated = await res.json()
      setPreguntas(prev => prev.map(q => q.id === p.id ? { ...q, ...updated } : q))
      setRespuestas(prev => { const n = { ...prev }; delete n[p.id]; return n })
    }
  }

  const handleEliminar = async (id: string) => {
    if (eliminando) return
    setEliminando(id)
    const res = await fetch(`/api/dashboard/preguntas/${id}`, { method: 'DELETE' })
    setEliminando(null)
    if (res.ok) setPreguntas(prev => prev.filter(q => q.id !== id))
  }

  const cardBase: React.CSSProperties = {
    background: '#1e1e1e',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
    letterSpacing: '0.06em', textTransform: 'uppercase',
    display: 'block', marginBottom: 6,
  }

  return (
    <div>
      {/* ── Pendientes ── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <h2 className="font-title text-white" style={{ fontSize: 20, letterSpacing: '0.04em' }}>
            PENDIENTES
          </h2>
          {pendientes.length > 0 && (
            <span style={{
              background: '#F97316', color: '#fff',
              borderRadius: 999, padding: '2px 8px',
              fontSize: 11, fontWeight: 700,
            }}>
              {pendientes.length}
            </span>
          )}
        </div>

        {pendientes.length === 0 ? (
          <div style={{ ...cardBase, padding: '32px 24px', textAlign: 'center' }}>
            <CheckCircle2 style={{ width: 32, height: 32, color: '#4ADE80', margin: '0 auto 10px' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
              Sin preguntas pendientes
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendientes.map(p => (
              <div key={p.id} style={cardBase}>
                <div style={{ padding: '14px 16px' }}>
                  {/* Sorteo + fecha */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 6, padding: '2px 8px',
                      fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600,
                    }}>
                      {p.sorteos?.nombre ?? 'Sorteo'}
                    </span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                      {formatFecha(p.created_at)}
                    </span>
                  </div>

                  {/* Pregunta */}
                  <p style={{ color: '#fff', fontSize: 14, fontWeight: 500, lineHeight: 1.45, marginBottom: 4 }}>
                    {p.pregunta}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 14 }}>
                    {p.nombre_autor}
                  </p>

                  {/* Formulario respuesta */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={labelStyle}>Tu respuesta</label>
                    <textarea
                      value={respuestas[p.id] ?? ''}
                      onChange={e => setRespuestas(prev => ({ ...prev, [p.id]: e.target.value }))}
                      placeholder="Escribe tu respuesta aquí..."
                      rows={3}
                      maxLength={600}
                      style={{
                        width: '100%', background: '#141414',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8, padding: '9px 12px',
                        fontSize: 13, color: '#fff', outline: 'none',
                        resize: 'vertical', fontFamily: 'inherit',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleResponder(p)}
                        disabled={!respuestas[p.id]?.trim() || enviando === p.id}
                        style={{
                          flex: 1, padding: '9px 0',
                          background: (!respuestas[p.id]?.trim() || enviando === p.id) ? 'rgba(34,197,94,0.35)' : '#22C55E',
                          color: '#fff', fontSize: 13, fontWeight: 700,
                          border: 'none', borderRadius: 8,
                          cursor: (!respuestas[p.id]?.trim() || enviando === p.id) ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        <Send style={{ width: 13, height: 13 }} />
                        {enviando === p.id ? 'Publicando...' : 'Responder y publicar'}
                      </button>
                      <button
                        onClick={() => handleEliminar(p.id)}
                        disabled={eliminando === p.id}
                        style={{
                          width: 40, background: 'rgba(239,68,68,0.08)',
                          border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: 8, cursor: eliminando === p.id ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#F87171', transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                        title="Eliminar pregunta"
                        aria-label="Eliminar pregunta"
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Publicadas ── */}
      {publicadas.length > 0 && (
        <div>
          <h2 className="font-title text-white" style={{ fontSize: 20, letterSpacing: '0.04em', marginBottom: 16 }}>
            PUBLICADAS
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {publicadas.map(p => {
              const open = expandidos.has(p.id)
              return (
                <div key={p.id} style={cardBase}>
                  <button
                    onClick={() => toggleExpandido(p.id)}
                    style={{
                      width: '100%', padding: '13px 16px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left',
                    }}
                  >
                    <ChevronDown style={{
                      width: 15, height: 15, flexShrink: 0, marginTop: 3,
                      color: 'rgba(255,255,255,0.35)',
                      transition: 'transform 0.2s',
                      transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                        {p.pregunta}
                      </p>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{p.nombre_autor}</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{p.sorteos?.nombre}</span>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleEliminar(p.id) }}
                      disabled={eliminando === p.id}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(255,255,255,0.2)', padding: 4, flexShrink: 0,
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#F87171' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)' }}
                      title="Eliminar"
                    >
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </button>
                  {open && (
                    <div style={{ padding: '0 16px 13px 43px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#4ADE80', marginTop: 12, marginBottom: 5, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Tu respuesta
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.6 }}>
                        {p.respuesta}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {preguntas.length === 0 && (
        <div style={{ ...cardBase, padding: '48px 24px', textAlign: 'center' }}>
          <MessageSquare style={{ width: 36, height: 36, color: 'rgba(255,255,255,0.15)', margin: '0 auto 12px' }} />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            Aún no hay preguntas en tus sorteos.
          </p>
        </div>
      )}
    </div>
  )
}
