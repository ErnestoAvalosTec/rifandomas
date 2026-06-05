import { createClient } from '@/lib/supabase/server'
import { OrdenesTable } from '@/components/dashboard/OrdenesTable'
import type { Database } from '@/types/database.types'

type SorteoRow = Database['public']['Tables']['sorteos']['Row']

export default async function OrdenesPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data: misSorteos } = await supabase
    .from('sorteos')
    .select('id')
    .eq('usuario_id', session.user.id)

  const sorteoIds = ((misSorteos ?? []) as Pick<SorteoRow, 'id'>[]).map((s) => s.id)

  const placeholder = '00000000-0000-0000-0000-000000000000'
  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('*, sorteos(nombre), pedido_boletos(boletos(numero))')
    .in('sorteo_id', sorteoIds.length ? sorteoIds : [placeholder])
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-title text-4xl text-white tracking-wide">ÓRDENES</h1>
        <p className="text-brand-muted font-body text-sm">Tus pedidos en tiempo real.</p>
      </div>
      <OrdenesTable sorteoIds={sorteoIds} pedidosIniciales={(pedidos ?? []) as any} />
    </div>
  )
}
