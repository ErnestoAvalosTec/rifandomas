'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2 } from 'lucide-react'

interface ResultadoBoleto {
  numero: string
  estatus: string
  sorteo: string
  titular: string | null
}

export function VerificadorBoleto() {
  const supabase = createClient()
  const sb = supabase as any
  const [numero, setNumero] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoBoleto | null>(null)
  const [noEncontrado, setNoEncontrado] = useState(false)

  const buscar = async () => {
    if (!numero.trim()) return
    setBuscando(true)
    setResultado(null)
    setNoEncontrado(false)

    const { data } = await sb
      .from('boletos')
      .select('numero, estatus, sorteo_id, pedido_id, sorteos(nombre), pedidos(cliente_nombre, cliente_apellidos)')
      .eq('numero', numero.padStart(4, '0'))
      .single()

    setBuscando(false)
    if (!data) { setNoEncontrado(true); return }

    setResultado({
      numero: data.numero,
      estatus: data.estatus,
      sorteo: data.sorteos?.nombre ?? 'Desconocido',
      titular: data.pedidos ? `${data.pedidos.cliente_nombre} ${data.pedidos.cliente_apellidos}` : null,
    })
  }

  const estatusBadgeVariant = (estatus: string) => {
    if (estatus === 'pagado') return 'pagado'
    if (estatus === 'reservado') return 'pendiente'
    return 'borrador'
  }

  return (
    <section id="verificador" className="py-24 bg-white border-y border-brand-border">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-primary text-sm font-ui font-semibold uppercase tracking-widest mb-3">Transparencia total</p>
        <h2 className="font-title text-5xl sm:text-6xl text-brand-text mb-4">VERIFICA TU BOLETO</h2>
        <p className="text-brand-muted font-body mb-8">
          Ingresa el número de tu boleto para ver su estatus actual en tiempo real.
        </p>

        <div className="flex gap-3 max-w-sm mx-auto">
          <Input
            placeholder="Ej: 0042"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
            maxLength={6}
            className="text-center text-lg font-ui tracking-widest"
          />
          <Button onClick={buscar} disabled={buscando || !numero} className="gap-2">
            {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Buscar
          </Button>
        </div>

        {noEncontrado && (
          <div className="mt-6 p-4 rounded-xl border border-brand-border bg-brand-card text-brand-muted font-body text-sm">
            No se encontró ningún boleto con ese número.
          </div>
        )}

        {resultado && (
          <div className="mt-6 p-6 rounded-2xl border border-brand-border bg-white shadow-sm text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-title text-3xl text-brand-text">#{resultado.numero}</span>
              <Badge variant={estatusBadgeVariant(resultado.estatus) as any} className="capitalize">
                {resultado.estatus}
              </Badge>
            </div>
            <div className="space-y-2 text-sm font-body">
              <div className="flex justify-between">
                <span className="text-brand-muted">Sorteo:</span>
                <span className="text-brand-text font-medium">{resultado.sorteo}</span>
              </div>
              {resultado.titular && (
                <div className="flex justify-between">
                  <span className="text-brand-muted">Titular:</span>
                  <span className="text-brand-text font-medium">{resultado.titular}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
