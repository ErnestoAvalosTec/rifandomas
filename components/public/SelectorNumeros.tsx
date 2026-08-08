'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Loader2, Search, Shuffle } from 'lucide-react'
import type { Database } from '@/types/database.types'

type EstatusBoleto = Database['public']['Tables']['boletos']['Row']['estatus']

interface SelectorNumerosProps {
  sorteoId: string
  totalNumeros: number
  esLoteria?: boolean
  seleccionados: string[]
  onSeleccionChange: (numeros: string[]) => void
  maxSeleccion: number
}

export function SelectorNumeros({
  sorteoId,
  totalNumeros,
  esLoteria = false,
  seleccionados,
  onSeleccionChange,
  maxSeleccion,
}: SelectorNumerosProps) {
  const supabase = createClient()
  const [boletos, setBoletos] = useState<Map<string, EstatusBoleto>>(new Map())
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  const digits = esLoteria ? Math.round(Math.log10(totalNumeros)) : String(totalNumeros).length

  const todosLosNumeros = useMemo(
    () => Array.from({ length: totalNumeros }, (_, i) => String(esLoteria ? i : i + 1).padStart(digits, '0')),
    [totalNumeros, esLoteria, digits]
  )

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      const { data } = await (supabase as any)
        .from('boletos')
        .select('numero, estatus')
        .eq('sorteo_id', sorteoId)

      const mapa = new Map<string, EstatusBoleto>()
      if (data) {
        data.forEach((b: { numero: string; estatus: EstatusBoleto }) => mapa.set(b.numero, b.estatus))
      }
      for (let i = 0; i < totalNumeros; i++) {
        const num = String(esLoteria ? i : i + 1).padStart(digits, '0')
        if (!mapa.has(num)) mapa.set(num, 'disponible')
      }
      setBoletos(mapa)
      setCargando(false)
    }
    cargar()
  }, [sorteoId, totalNumeros, esLoteria, digits])

  useEffect(() => {
    const channel = supabase
      .channel(`boletos-sorteo-${sorteoId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'boletos',
          filter: `sorteo_id=eq.${sorteoId}`,
        },
        (payload: { new: { numero: string; estatus: EstatusBoleto } }) => {
          const { numero, estatus } = payload.new
          setBoletos((prev) => {
            const next = new Map(prev)
            next.set(numero, estatus)
            return next
          })
          if (estatus !== 'disponible' && seleccionados.includes(payload.new.numero)) {
            onSeleccionChange(seleccionados.filter((n) => n !== payload.new.numero))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sorteoId, seleccionados, onSeleccionChange])

  const toggleNumero = useCallback(
    (numero: string) => {
      const estatus = boletos.get(numero)
      if (estatus !== 'disponible') return

      if (seleccionados.includes(numero)) {
        onSeleccionChange(seleccionados.filter((n) => n !== numero))
      } else {
        if (seleccionados.length >= maxSeleccion) return
        onSeleccionChange([...seleccionados, numero])
      }
    },
    [boletos, seleccionados, onSeleccionChange, maxSeleccion]
  )

  const faltantes = maxSeleccion - seleccionados.length

  const elegirAlAzar = useCallback(() => {
    const disponibles = todosLosNumeros.filter(
      (n) => (boletos.get(n) ?? 'disponible') === 'disponible' && !seleccionados.includes(n)
    )
    if (faltantes <= 0 || disponibles.length === 0) return

    for (let i = disponibles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[disponibles[i], disponibles[j]] = [disponibles[j], disponibles[i]]
    }

    onSeleccionChange([...seleccionados, ...disponibles.slice(0, faltantes)])
  }, [todosLosNumeros, boletos, seleccionados, faltantes, onSeleccionChange])

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const numeros = todosLosNumeros

  const search = busqueda.trim()
  const numerosFiltrados = search
    ? numeros.filter(n => n.includes(search) || n.replace(/^0+/, '').startsWith(search))
    : numeros

  return (
    <div>
      {/* Buscador */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'rgba(255,255,255,0.35)' }} />
        <input
          type="text"
          inputMode="numeric"
          placeholder="Busca tu número (ej. 42)"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value.replace(/\D/g, '').slice(0, 4))}
          style={{
            width: '100%', paddingLeft: 36, paddingRight: 12, height: 40,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10, color: '#fff', fontSize: 17, outline: 'none',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(12, 150, 70,0.5)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
        />
        {search && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-ui" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {numerosFiltrados.length} resultado{numerosFiltrados.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-4 text-xs font-ui">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-brand-green/40 border border-brand-green/50" />
          Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-brand-gold/40 border border-brand-gold" />
          Seleccionado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-brand-border/50 border border-brand-border" />
          Ocupado
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm font-ui text-brand-muted">
          <span className="text-white font-semibold">{seleccionados.length}</span> de{' '}
          <span className="text-white font-semibold">{maxSeleccion}</span> números seleccionados
        </p>
        {faltantes > 0 && (
          <button
            type="button"
            onClick={elegirAlAzar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-ui font-semibold flex-shrink-0 transition-colors duration-150"
            style={{ background: 'rgba(12, 150, 70,0.12)', border: '1px solid rgba(12, 150, 70,0.35)', color: '#0C9646' }}
          >
            <Shuffle className="w-3.5 h-3.5" />
            Elegir al azar
          </button>
        )}
      </div>

      {numerosFiltrados.length === 0 && (
        <p className="text-center py-6 text-sm font-ui" style={{ color: 'rgba(255,255,255,0.35)' }}>
          No hay números disponibles con ese criterio.
        </p>
      )}

      <div
        className="grid gap-1.5 max-h-72 overflow-y-auto pr-1"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))' }}
      >
        {numerosFiltrados.map((num) => {
          const estatus = boletos.get(num) ?? 'disponible'
          const estaSeleccionado = seleccionados.includes(num)
          const disponible = estatus === 'disponible'
          const puedeSeleccionar = disponible && (estaSeleccionado || seleccionados.length < maxSeleccion)

          return (
            <button
              key={num}
              onClick={() => toggleNumero(num)}
              disabled={!disponible}
              className={cn(
                'h-10 rounded-lg text-xs font-ui font-semibold transition-all duration-150 border',
                estaSeleccionado
                  ? 'numero-seleccionado'
                  : disponible
                  ? cn('numero-disponible', !puedeSeleccionar && 'opacity-50 cursor-not-allowed')
                  : 'numero-reservado'
              )}
              aria-label={`Número ${num} — ${estaSeleccionado ? 'seleccionado' : estatus}`}
              aria-pressed={estaSeleccionado}
            >
              {num}
            </button>
          )
        })}
      </div>

      {seleccionados.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {seleccionados.map((num) => (
            <button
              key={num}
              onClick={() => onSeleccionChange(seleccionados.filter((n) => n !== num))}
              className="px-3 py-1 rounded-full bg-brand-gold/20 border border-brand-gold text-brand-gold text-xs font-ui hover:bg-red-500/20 hover:border-red-500 hover:text-red-400 transition-colors duration-150 cursor-pointer"
              aria-label={`Quitar número ${num}`}
            >
              {num} ×
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
