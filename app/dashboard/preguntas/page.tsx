import { createClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { PreguntasDashboard } from '@/components/dashboard/PreguntasDashboard'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PreguntasPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const admin = createAdminSupabaseClient()

  const { data: sorteos } = await (admin as any)
    .from('sorteos')
    .select('id')
    .eq('usuario_id', session.user.id)

  const ids: string[] = (sorteos ?? []).map((s: any) => s.id)

  const placeholder = '00000000-0000-0000-0000-000000000000'
  const { data: preguntas } = await (admin as any)
    .from('preguntas_sorteo')
    .select('*, sorteos(id, nombre)')
    .in('sorteo_id', ids.length ? ids : [placeholder])
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-title text-4xl text-white tracking-wide">PREGUNTAS</h1>
        <p className="text-brand-muted font-body text-sm mt-1">
          Responde o elimina las preguntas de tus sorteos.
        </p>
      </div>
      <PreguntasDashboard preguntasIniciales={preguntas ?? []} />
    </div>
  )
}
