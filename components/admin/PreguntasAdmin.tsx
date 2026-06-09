'use client'

import { useState } from 'react'
import { Trash2, ChevronDown, Pencil, Check, X } from 'lucide-react'

interface PreguntaAdmin {
  id: string
  sorteo_id: string
  nombre_autor: string
  pregunta: string
  respuesta: string | null
  estado: 'pendiente' | 'publicada'
  created_at: string
  sorteos?: { id: string; nombre: string; perfiles?: { nombre: string; apellidos: string } }
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function PreguntasAdmin({ preguntasIniciales }: { preguntasIniciales: PreguntaAdmin[] }) {
  const [preguntas, setPreguntas] = useState<PreguntaAdmin[]>(preguntasIniciales)
  const [filtro, setFiltro] = useState<'todas' | 'pendiente' | 'publicada'>('todas')
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [editando, setEditando] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ pregunta: string; nombre_autor: string; respuesta: string }>({ pregunta: '', nombre_autor: '', respuesta: '' })
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)

  const toggle = (id: string) =>
    setExpandidos(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const iniciarEdicion = (p: PreguntaAdmin) => {
    setEditando(p.id)
    setEditData({ pregunta: p.pregunta, nombre_autor: p.nombre_autor, respuesta: p.respuesta ?? '' })
  }

  const guardarEdicion = async (id: string) => {
    setGuardando(true)
    const res = await fetch(`/api/admin/preguntas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    })
    setGuardando(false)
    if (res.ok) {
      const updated = await res.json()
      setPreguntas(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p))
      setEditando(null)
    }
  }

  const eliminar = async (id: string) => {
    setEliminando(id)
    const res = await fetch(`/api/admin/preguntas/${id}`, { method: 'DELETE' })
    setEliminando(null)
    if (res.ok) setPreguntas(prev => prev.filter(p => p.id !== id))
  }

  const filtradas = preguntas.filter(p => filtro === 'todas' || p.estado === filtro)

  const pill = (label: string, val: typeof filtro) => (
    <button
      onClick={() => setFiltro(val)}
      style={{
        padding: '5px 14px',
        borderRadius: 999,
        border: `1px solid ${filtro === val ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)'}`,
        background: filtro === val ? 'rgba(34,197,94,0.12)' : 'transparent',
        color: filtro === val ? '#4ADE80' : 'rgba(255,255,255,0.5)',
        fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )

  const cardBase: React.CSSProperties = {
    background: '#1e1e1e',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#141414',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 7, padding: '8px 10px',
    fontSize: 13, color: '#fff', outline: 'none',
    fontFamily: 'inherit',
  }

  return (
    <div>
      {/* Filtros + stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {pill('Todas', 'todas')}
        {pill('Pendientes', 'pendiente')}
        {pill('Publicadas', 'publicada')}
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>
          {filtradas.length} {filtradas.length === 1 ? 'pregunta' : 'preguntas'}
        </span>
      </div>

      {filtradas.length === 0 ? (
        <div style={{ ...cardBase, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No hay preguntas con este filtro.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtradas.map(p => {
            const open = expandidos.has(p.id)
            const isEditing = editando === p.id
            const autor = p.sorteos?.perfiles
              ? `${p.sorteos.perfiles.nombre} ${p.sorteos.perfiles.apellidos}`
              : 'Socio'

            return (
              <div key={p.id} style={cardBase}>
                {/* Header row */}
                <button
                  onClick={() => toggle(p.id)}
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
                    <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{
                        background: p.estado === 'publicada' ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)',
                        border: `1px solid ${p.estado === 'publicada' ? 'rgba(34,197,94,0.3)' : 'rgba(249,115,22,0.3)'}`,
                        color: p.estado === 'publicada' ? '#4ADE80' : '#FB923C',
                        borderRadius: 4, padding: '1px 6px',
                        fontSize: 10, fontWeight: 700,
                      }}>
                        {p.estado === 'publicada' ? 'Publicada' : 'Pendiente'}
                      </span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                        {p.sorteos?.nombre}
                      </span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                        por {autor}
                      </span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                        {formatFecha(p.created_at)}
                      </span>
                    </div>
                  </div>
                  {/* Actions (stop propagation to not toggle) */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => isEditing ? setEditando(null) : iniciarEdicion(p)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: isEditing ? '#4ADE80' : 'rgba(255,255,255,0.3)',
                        padding: 5, transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#4ADE80' }}
                      onMouseLeave={e => { if (!isEditing) e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
                      title="Editar"
                    >
                      <Pencil style={{ width: 13, height: 13 }} />
                    </button>
                    <button
                      onClick={() => eliminar(p.id)}
                      disabled={eliminando === p.id}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(255,255,255,0.3)', padding: 5, transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#F87171' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
                      title="Eliminar"
                    >
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                </button>

                {/* Body — expanded */}
                {open && (
                  <div style={{ padding: '0 16px 16px 43px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12 }}>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                            Autor
                          </label>
                          <input value={editData.nombre_autor} onChange={e => setEditData(d => ({ ...d, nombre_autor: e.target.value }))} style={inputStyle} maxLength={50} />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                            Pregunta
                          </label>
                          <textarea value={editData.pregunta} onChange={e => setEditData(d => ({ ...d, pregunta: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} rows={2} maxLength={400} />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                            Respuesta
                          </label>
                          <textarea value={editData.respuesta} onChange={e => setEditData(d => ({ ...d, respuesta: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} rows={3} maxLength={600} placeholder="Dejar vacío para mantener como pendiente" />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => guardarEdicion(p.id)}
                            disabled={guardando}
                            style={{
                              flex: 1, padding: '8px 0',
                              background: '#22C55E', color: '#fff',
                              fontSize: 12, fontWeight: 700,
                              border: 'none', borderRadius: 8, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            }}
                          >
                            <Check style={{ width: 13, height: 13 }} />
                            {guardando ? 'Guardando...' : 'Guardar cambios'}
                          </button>
                          <button
                            onClick={() => setEditando(null)}
                            style={{
                              width: 38, background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: 8, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'rgba(255,255,255,0.5)',
                            }}
                          >
                            <X style={{ width: 13, height: 13 }} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ paddingTop: 12 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginBottom: 5, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                          Preguntó: {p.nombre_autor}
                        </p>
                        {p.respuesta ? (
                          <>
                            <p style={{ fontSize: 10, fontWeight: 700, color: '#4ADE80', marginTop: 10, marginBottom: 5, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                              Respuesta publicada
                            </p>
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.6 }}>
                              {p.respuesta}
                            </p>
                          </>
                        ) : (
                          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontStyle: 'italic' }}>
                            Sin respuesta aún.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
