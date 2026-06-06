import { createClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { OrdenesTable } from '@/components/dashboard/OrdenesTable'
import { redirect } from 'next/navigation'

export default async function OrdenesPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const admin = createAdminSupabaseClient()

  const { data: misSorteos } = await (admin as any)
    .from('sorteos')
    .select('id, nombre')
    .eq('usuario_id', session.user.id)
    .order('created_at', { ascending: false })

  const sorteos: { id: string; nombre: string }[] = misSorteos ?? []
  const sorteoIds = sorteos.map((s) => s.id)

  const placeholder = '00000000-0000-0000-0000-000000000000'
  const { data: pedidos } = await (admin as any)
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
      <OrdenesTable sorteos={sorteos} pedidosIniciales={(pedidos ?? []) as any} />
    </div>
  )
}
