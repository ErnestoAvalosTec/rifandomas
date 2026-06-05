'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Clock, Ticket } from 'lucide-react'
import type { Database } from '@/types/database.types'

type Sorteo = Database['public']['Tables']['sorteos']['Row'] & {
  premios: Database['public']['Tables']['premios']['Row'][]
  boletos_vendidos?: number
}

interface Paquete {
  cantidad: number
  label: string
  destacado?: boolean
}

interface SorteoCardProps {
  sorteo: Sorteo
  onParticipar: (sorteo: Sorteo, paquete: Paquete) => void
}

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now()
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  return timeLeft
}

function buildPaquetes(sorteo: Sorteo): Paquete[] {
  if (sorteo.promo_activa && sorteo.promo_tipo === 'x_por_y' && sorteo.promo_config) {
    const cfg = sorteo.promo_config as { compra: number; paga: number }[]
    return cfg.map((p) => ({
      cantidad: p.compra,
      label: `${p.compra} por ${p.paga} (${formatCurrency(sorteo.precio_unitario * p.paga)})`,
      destacado: p.compra === cfg[1]?.compra,
    }))
  }
  const precio = sorteo.precio_unitario
  return [
    { cantidad: 1, label: `1 boleto — ${formatCurrency(precio)}` },
    { cantidad: 3, label: `3 boletos — ${formatCurrency(precio * 3)}`, destacado: true },
    { cantidad: 5, label: `5 boletos — ${formatCurrency(precio * 5)}` },
    { cantidad: 10, label: `10 boletos — ${formatCurrency(precio * 10)}` },
  ]
}

export function SorteoCard({ sorteo, onParticipar }: SorteoCardProps) {
  const primerPremio = sorteo.premios?.find((p) => p.lugar === 1)
  const paquetes = buildPaquetes(sorteo)
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState<Paquete>(paquetes[1] ?? paquetes[0])
  const countdown = useCountdown(sorteo.fecha_sorteo)
  const vendidos = sorteo.boletos_vendidos ?? 0
  const porcentaje = Math.round((vendidos / sorteo.total_numeros) * 100)

  return (
    <div className="card-premio">
      {/* Floating prize image */}
      {primerPremio?.imagen_url ? (
        <Image
          src={primerPremio.imagen_url}
          alt={primerPremio.nombre}
          width={160}
          height={160}
          className="premio-imagen"
          priority
        />
      ) : (
        <div className="premio-imagen flex items-center justify-center">
          <div className="w-32 h-32 rounded-2xl bg-brand-border flex items-center justify-center">
            <Ticket className="w-16 h-16 text-brand-muted" />
          </div>
        </div>
      )}

      <div className="p-6 pt-4">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Badge variant="default" className="text-xs">
            🥇 1er Premio
          </Badge>
          {porcentaje >= 80 && (
            <Badge variant="rechazado" className="text-xs animate-pulse">
              ¡Casi lleno!
            </Badge>
          )}
        </div>

        {/* Prize name */}
        <h3 className="font-title text-2xl text-white tracking-wide leading-tight mb-1">
          {primerPremio?.nombre ?? sorteo.nombre}
        </h3>
        {primerPremio?.descripcion && (
          <p className="text-brand-muted text-sm font-body mb-2 line-clamp-2">{primerPremio.descripcion}</p>
        )}
        {primerPremio?.valor_estimado && (
          <p className="text-brand-gold font-ui text-sm font-semibold mb-4">
            Valor estimado: {formatCurrency(primerPremio.valor_estimado)}
          </p>
        )}

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-brand-muted font-ui mb-1.5">
            <span>{vendidos.toLocaleString('es-MX')} vendidos</span>
            <span>{sorteo.total_numeros.toLocaleString('es-MX')} total</span>
          </div>
          <Progress value={porcentaje} className="h-2.5" />
          <p className="text-right text-xs text-primary font-ui mt-1">{porcentaje}% vendido</p>
        </div>

        {/* Countdown */}
        <div className="mb-5 p-3 rounded-xl bg-brand-border/30 border border-brand-border">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-brand-muted font-ui">Sorteo en:</span>
          </div>
          <div className="grid grid-cols-4 gap-1 text-center">
            {[
              { val: countdown.days, label: 'días' },
              { val: countdown.hours, label: 'hrs' },
              { val: countdown.minutes, label: 'min' },
              { val: countdown.seconds, label: 'seg' },
            ].map(({ val, label }) => (
              <div key={label} className="bg-brand-bg rounded-lg p-1.5">
                <p className="font-title text-xl text-white leading-none">
                  {String(val).padStart(2, '0')}
                </p>
                <p className="text-[10px] text-brand-muted font-ui">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Package buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {paquetes.map((pkg) => (
            <button
              key={pkg.cantidad}
              onClick={() => setPaqueteSeleccionado(pkg)}
              className={`relative p-2.5 rounded-xl border text-xs font-ui text-left transition-all duration-200 cursor-pointer ${
                paqueteSeleccionado.cantidad === pkg.cantidad
                  ? 'border-primary bg-primary/10 text-white'
                  : 'border-brand-border bg-brand-border/20 text-brand-muted hover:border-brand-muted'
              }`}
            >
              {pkg.destacado && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-ui px-2 py-0.5 rounded-full whitespace-nowrap">
                  Más popular
                </span>
              )}
              {pkg.label}
            </button>
          ))}
        </div>

        {/* CTA */}
        <Button
          size="lg"
          className="w-full gap-2 font-ui font-bold text-base"
          onClick={() => onParticipar(sorteo, paqueteSeleccionado)}
        >
          <Ticket className="w-5 h-5" />
          ¡Participar!
        </Button>

        <p className="text-center text-[11px] text-brand-muted font-body mt-2">
          {formatCurrency(sorteo.precio_unitario)} por boleto · Precio fijo
        </p>
      </div>
    </div>
  )
}
