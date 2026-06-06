import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SorteoForm } from '@/components/dashboard/SorteoForm'

export default async function NuevoSorteoPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const userId = session.user.id

  const { data: perfil } = await (supabase as any).from('perfiles').select('id').eq('id', userId).single()

  if (!perfil) {
    const email = session.user.email ?? ''
    await (supabase as any).from('perfiles').insert({
      id: userId,
      nombre: email.split('@')[0],
      apellidos: '',
      rol: 'usuario',
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-title text-4xl text-white tracking-wide">CREAR SORTEO</h1>
        <p className="text-brand-muted font-body text-sm mt-1">
          Completa la información. El sorteo quedará en revisión hasta que un administrador lo apruebe.
        </p>
      </div>
      <SorteoForm userId={userId} />
    </div>
  )
}
