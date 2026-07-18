import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

export interface PedidoArchivado {
  id: string
  cliente_nombre: string
  cliente_apellidos: string
  cliente_telefono: string
  monto_total: number
  estatus: string
  created_at: string
  referencia: string | null
  numeros: string[]
}

export function PedidosSoloLectura({ pedidos }: { pedidos: PedidoArchivado[] }) {
  if (!pedidos.length) {
    return <p className="text-sm text-brand-muted font-body py-4 text-center">Este sorteo no tuvo pedidos.</p>
  }

  return (
    <div className="space-y-2">
      {pedidos.map((p) => (
        <div
          key={p.id}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl bg-brand-bg border border-brand-border"
        >
          <div className="min-w-0">
            <p className="font-ui font-semibold text-white text-sm truncate">
              {p.cliente_nombre} {p.cliente_apellidos}
              {p.referencia && <span className="text-brand-muted font-normal"> · {p.referencia}</span>}
            </p>
            <p className="text-xs text-brand-muted">
              {p.cliente_telefono}
              {p.numeros.length > 0 && <> · Núms: {p.numeros.join(', ')}</>}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="font-ui font-semibold text-white text-sm">{formatCurrency(p.monto_total)}</span>
            <Badge variant={p.estatus as any}>{p.estatus}</Badge>
          </div>
        </div>
      ))}
    </div>
  )
}
