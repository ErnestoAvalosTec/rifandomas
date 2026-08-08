import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import type { Database } from '@/types/database.types'

type PerfilRow = Database['public']['Tables']['perfiles']['Row']

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const { data: perfilData } = await supabase
    .from('perfiles')
    .select('nombre, apellidos')
    .eq('id', session.user.id)
    .single()

  const perfil = perfilData as Pick<PerfilRow, 'nombre' | 'apellidos'> | null
  const userName = perfil ? `${perfil.nombre} ${perfil.apellidos}` : session.user.email

  const { data: marcaData } = await (supabase as any)
    .from('marca').select('logo_url').eq('id', 1).single()

  return (
    <div className="min-h-screen bg-brand-bg">
      <Sidebar userName={userName ?? undefined} logoUrl={marcaData?.logo_url} />
      <main className="lg:pl-64">
        <div className="pt-14 lg:pt-0 p-4 sm:p-6 lg:p-8 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  )
}
