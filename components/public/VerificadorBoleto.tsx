'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Loader2 } from 'lucide-react'

interface SorteoOpcion {
  id: string
  nombre: string
}

interface ResultadoBoleto {
  numero: string
  nombre?: string
  estatus?: 'pagado' | 'pendiente_pago'
  disponible?: boolean
}

export function VerificadorBoleto({ sorteos }: { sorteos: SorteoOpcion[] }) {
  const [sorteoId, setSorteoId] = useState(sorteos[0]?.id ?? '')
  const [numero, setNumero] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoBoleto | null>(null)
  const [error, setError] = useState<string | null>(null)

  const buscar = async () => {
    if (!sorteoId || !numero.trim()) return
    setBuscando(true)
    setResultado(null)
    setError(null)

    try {
      const params = new URLSearchParams({ sorteo_id: sorteoId, numero: numero.trim() })
      const res = await fetch(`/api/verificar-boleto?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? 'No se pudo verificar el boleto.')
      } else {
        setResultado(data)
      }
    } catch {
      setError('No se pudo verificar el boleto. Intenta de nuevo.')
    } finally {
      setBuscando(false)
    }
  }

  if (!sorteos.length) return null

  return (
    <section id="verificador" className="py-16" style={{ background: '#1c1c1c', borderTop: '1px solid #3a3a3a' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-primary text-sm font-ui font-semibold uppercase tracking-widest mb-3">Transparencia total</p>
        <h2 className="font-title text-white" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', letterSpacing: '0.02em', marginBottom: 8 }}>
          VERIFICA TU BOLETO
        </h2>
        <p className="font-body mx-auto mb-8" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(13px, 2vw, 15px)', maxWidth: 480 }}>
          Selecciona tu sorteo, ingresa el número de tu boleto y conoce su estatus al instante.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          {sorteos.length > 1 && (
            <Select value={sorteoId} onValueChange={setSorteoId}>
              <SelectTrigger className="sm:w-1/2">
                <SelectValue placeholder="Elige un sorteo" />
              </SelectTrigger>
              <SelectContent>
                {sorteos.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input
            placeholder="Ej: 0042"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
            maxLength={6}
            className={`text-center text-lg font-ui tracking-widest ${sorteos.length > 1 ? 'sm:w-1/2' : 'w-full'}`}
          />
        </div>

        <Button onClick={buscar} disabled={buscando || !numero.trim() || !sorteoId} className="gap-2 mt-4">
          {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Verificar
        </Button>

        {error && (
          <div className="mt-6 p-4 rounded-xl border text-sm font-body" style={{ borderColor: '#3a3a3a', background: '#252525', color: 'rgba(255,255,255,0.6)' }}>
            {error}
          </div>
        )}

        {resultado && (
          <div className="mt-6 p-6 rounded-2xl border text-left" style={{ borderColor: '#3a3a3a', background: '#252525' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-title text-3xl text-white">#{resultado.numero}</span>
              {resultado.estatus && (
                <Badge variant={resultado.estatus === 'pagado' ? 'pagado' : 'pendiente'} className="capitalize">
                  {resultado.estatus === 'pagado' ? 'Pagado' : 'Pendiente de pago'}
                </Badge>
              )}
            </div>
            {resultado.disponible ? (
              <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Este boleto aún está disponible — ¡nadie lo ha apartado!
              </p>
            ) : resultado.nombre ? (
              <p className="font-body text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Apartado por <span className="text-white font-medium">{resultado.nombre}</span>
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}
