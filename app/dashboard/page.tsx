import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Ticket, ShoppingCart, TrendingUp } from 'lucide-react'
import type { Database } from '@/types/database.types'

type SorteoRow = Database['public']['Tables']['sorteos']['Row']
type PedidoRow = Database['public']['Tables']['pedidos']['Row']

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data: sorteosData } = await supabase
    .from('sorteos')
    .select('id, nombre, estatus, total_numeros, created_at')
    .eq('usuario_id', session.user.id)
    .order('created_at', { ascending: false })

  const sorteos = (sorteosData ?? []) as Pick<SorteoRow, 'id' | 'nombre' | 'estatus' | 'total_numeros' | 'created_at'>[]
  const sorteoIds = sorteos.map((s) => s.id)
  const sorteosRecientes = sorteos.slice(0, 5)

  const { data: pedidosData } = sorteoIds.length
    ? await supabase
        .from('pedidos')
        .select('id, monto_total, estatus, created_at')
        .in('sorteo_id', sorteoIds)
    : { data: [] }

  const pedidos = (pedidosData ?? []) as Pick<PedidoRow, 'id' | 'monto_total' | 'estatus' | 'created_at'>[]

  const totalIngresos = pedidos.filter((p) => p.estatus === 'pagado').reduce((acc, p) => acc + Number(p.monto_total), 0)
  const sorteoActivo = sorteos.filter((s) => s.estatus === 'activo').length

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-title text-4xl text-white tracking-wide">MI PANEL</h1>
          <p className="text-brand-muted font-body text-sm">Gestiona tus sorteos y órdenes.</p>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link href="/dashboard/sorteos/nuevo"><Plus className="w-4 h-4" />Nuevo Sorteo</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Sorteos activos', value: sorteoActivo, icon: Ticket, color: 'text-brand-green' },
          { label: 'Pedidos totales', value: pedidos.length, icon: ShoppingCart, color: 'text-brand-gold' },
          { label: 'Ingresos pagados', value: formatCurrency(totalIngresos), icon: TrendingUp, color: 'text-primary' },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-brand-card border border-brand-border rounded-2xl p-4">
              <Icon className={`w-5 h-5 mb-2 ${stat.color}`} />
              <p className="font-title text-2xl text-white">{stat.value}</p>
              <p className="text-xs text-brand-muted font-ui mt-0.5">{stat.label}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-ui font-semibold text-white">Mis sorteos recientes</h2>
          <Link href="/dashboard/sorteos" className="text-xs text-primary hover:underline font-ui">Ver todos</Link>
        </div>
        {!sorteos.length ? (
          <div className="text-center py-8">
            <p className="text-brand-muted font-body text-sm mb-4">Aún no tienes sorteos creados.</p>
            <Button asChild size="sm"><Link href="/dashboard/sorteos/nuevo">Crear mi primer sorteo</Link></Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sorteosRecientes.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-brand-border last:border-0">
                <div>
                  <p className="text-sm font-ui text-white">{s.nombre}</p>
                  <p className="text-xs text-brand-muted">{formatDate(s.created_at)}</p>
                </div>
                <Badge variant={s.estatus as any}>{s.estatus}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
