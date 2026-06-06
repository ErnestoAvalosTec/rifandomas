import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { SorteoForm } from '@/components/dashboard/SorteoForm'

export default async function AdminEditarSorteoPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const [{ data: sorteo }, { data: premios }] = await Promise.all([
    (supabase as any).from('sorteos').select('*').eq('id', params.id).single(),
    (supabase as any).from('premios').select('*').eq('sorteo_id', params.id).order('lugar', { ascending: true }),
  ])

  if (!sorteo) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-title text-4xl text-white tracking-wide">EDITAR SORTEO</h1>
        <p className="text-brand-muted font-body text-sm mt-1 truncate">{sorteo.nombre}</p>
      </div>
      <SorteoForm
        sorteo={sorteo}
        userId={sorteo.usuario_id}
        adminMode
        premiosIniciales={premios ?? []}
      />
    </div>
  )
}
