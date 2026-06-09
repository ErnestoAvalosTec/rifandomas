import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { PreguntasAdmin } from '@/components/admin/PreguntasAdmin'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminPreguntasPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const admin = createAdminSupabaseClient()

  const { data: perfil } = await (admin as any)
    .from('perfiles')
    .select('rol')
    .eq('id', session.user.id)
    .single()

  if (perfil?.rol !== 'admin') redirect('/dashboard')

  const { data: preguntas } = await (admin as any)
    .from('preguntas_sorteo')
    .select('*, sorteos(id, nombre, perfiles(nombre, apellidos))')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-title text-4xl text-white tracking-wide">PREGUNTAS</h1>
        <p className="text-brand-muted font-body text-sm mt-1">
          Modera preguntas y respuestas de todos los sorteos.
        </p>
      </div>
      <PreguntasAdmin preguntasIniciales={preguntas ?? []} />
    </div>
  )
}
