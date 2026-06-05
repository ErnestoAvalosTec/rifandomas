import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SorteoForm } from '@/components/dashboard/SorteoForm'

export default async function NuevoSorteoPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-title text-4xl text-white tracking-wide">CREAR SORTEO</h1>
        <p className="text-brand-muted font-body text-sm mt-1">
          Completa la información. El sorteo quedará en revisión hasta que un administrador lo apruebe.
        </p>
      </div>
      <SorteoForm userId={session.user.id} />
    </div>
  )
}
