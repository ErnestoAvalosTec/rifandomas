'use client'

import { useState } from 'react'
import { SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react'

export interface Filtros {
  categoria: string
  precioMin: string
  precioMax: string
}

const PANEL_W = 190   // panel content width
const TAB_W   = 32    // tab width — wide enough for touch + icon

interface FiltroPanelProps {
  categoriasDisponibles: string[]
  filtros: Filtros
  onChange: (f: Filtros) => void
  resultados: number
  total: number
}

export function FiltroPanel({ categoriasDisponibles, filtros, onChange, resultados, total }: FiltroPanelProps) {
  const [visible, setVisible] = useState(true)

  const hayFiltros = !!(filtros.categoria || filtros.precioMin || filtros.precioMax)
  const limpiar = () => onChange({ categoria: '', precioMin: '', precioMax: '' })

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#161616',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 7,
    padding: '7px 9px',
    fontSize: 12,
    outline: 'none',
  }

  return (
    <>
      <div
        style={{
          transform: visible
            ? 'translateY(-50%) translateX(0)'
            : `translateY(-50%) translateX(${PANEL_W}px)`,
          position: 'fixed',
          right: 0,
          top: '50%',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          background: '#252525',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRight: 'none',
          borderRadius: '12px 0 0 12px',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.4)',
        }}
      >
        {/* ── Toggle tab ── */}
        <button
          onClick={() => setVisible(v => !v)}
          title={visible ? 'Ocultar filtros' : 'Mostrar filtros'}
          style={{
            width: TAB_W,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            borderTop: 'none',
            borderBottom: 'none',
            borderLeft: 'none',
            borderRight: '1px solid rgba(255,255,255,0.07)',
            background: visible ? 'transparent' : 'rgba(74,222,128,0.08)',
            cursor: 'pointer',
            padding: '10px 0',
            borderRadius: 0,
            transition: 'background 0.2s',
            minHeight: 72,
          }}
        >
          {visible ? (
            <ChevronRight style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.45)' }} />
          ) : (
            <>
              <SlidersHorizontal style={{ width: 12, height: 12, color: '#4ADE80' }} />
              <ChevronLeft style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.7)' }} />
            </>
          )}
        </button>

        {/* ── Panel content ── */}
        <div
          style={{
            width: PANEL_W,
            padding: '16px 14px 16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: '#fff', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.07em', textTransform: 'uppercase',
            }}>
              <SlidersHorizontal style={{ width: 13, height: 13, color: '#4ADE80', flexShrink: 0 }} />
              Filtros
            </span>
            {hayFiltros && (
              <button
                onClick={limpiar}
                title="Limpiar filtros"
                style={{
                  color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
                  lineHeight: 0, background: 'none', border: 'none', padding: 0,
                }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>

          {/* Results badge */}
          <div style={{
            background: hayFiltros ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${hayFiltros ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 7, padding: '5px 8px', textAlign: 'center',
            color: hayFiltros ? '#4ADE80' : 'rgba(255,255,255,0.35)',
            fontSize: 10, fontWeight: 600,
          }}>
            {hayFiltros ? `${resultados} de ${total} sorteos` : `${total} sorteos`}
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

          {/* Category */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <p style={{
              color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0,
            }}>
              Categoría
            </p>
            <select
              value={filtros.categoria}
              onChange={e => onChange({ ...filtros, categoria: e.target.value })}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">Todas</option>
              {categoriasDisponibles.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

          {/* Price range */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{
              color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0,
            }}>
              Precio de boleto
            </p>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, display: 'block', marginBottom: 4 }}>
                Mínimo ($)
              </label>
              <input
                type="number" min={0}
                value={filtros.precioMin}
                onChange={e => onChange({ ...filtros, precioMin: e.target.value })}
                placeholder="0"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, display: 'block', marginBottom: 4 }}>
                Máximo ($)
              </label>
              <input
                type="number" min={0}
                value={filtros.precioMax}
                onChange={e => onChange({ ...filtros, precioMax: e.target.value })}
                placeholder="Sin límite"
                style={inputStyle}
              />
            </div>
          </div>

          {hayFiltros && (
            <>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
              <button
                onClick={limpiar}
                style={{
                  width: '100%', padding: '8px 0',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.55)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 7, fontSize: 10, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Limpiar filtros
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
