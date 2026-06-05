'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import type { Database } from '@/types/database.types'

type EstatusBoleto = Database['public']['Tables']['boletos']['Row']['estatus']

interface SelectorNumerosProps {
  sorteoId: string
  totalNumeros: number
  seleccionados: string[]
  onSeleccionChange: (numeros: string[]) => void
  maxSeleccion: number
}

export function SelectorNumeros({
  sorteoId,
  totalNumeros,
  seleccionados,
  onSeleccionChange,
  maxSeleccion,
}: SelectorNumerosProps) {
  const supabase = createClient()
  const [boletos, setBoletos] = useState<Map<string, EstatusBoleto>>(new Map())
  const [cargando, setCargando] = useState(true)

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
      for (let i = 1; i <= totalNumeros; i++) {
        const num = String(i).padStart(4, '0')
        if (!mapa.has(num)) mapa.set(num, 'disponible')
      }
      setBoletos(mapa)
      setCargando(false)
    }
    cargar()
  }, [sorteoId, totalNumeros])

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

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const numeros = Array.from({ length: totalNumeros }, (_, i) =>
    String(i + 1).padStart(4, '0')
  )

  return (
    <div>
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

      <p className="text-sm font-ui text-brand-muted mb-3">
        <span className="text-white font-semibold">{seleccionados.length}</span> de{' '}
        <span className="text-white font-semibold">{maxSeleccion}</span> números seleccionados
      </p>

      <div
        className="grid gap-1.5 max-h-72 overflow-y-auto pr-1"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))' }}
      >
        {numeros.map((num) => {
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
