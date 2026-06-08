import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import type { Database } from '@/types/database.types'

type PerfilRow = Database['public']['Tables']['perfiles']['Row']

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: perfilData } = await supabase
    .from('perfiles')
    .select('rol, nombre')
    .eq('id', session.user.id)
    .single()

  const perfil = perfilData as Pick<PerfilRow, 'rol' | 'nombre'> | null
  if (perfil?.rol !== 'admin') redirect('/dashboard')

  const { data: marcaData } = await (supabase as any)
    .from('marca').select('logo_url').eq('id', 1).single()

  return (
    <div className="min-h-screen bg-brand-bg flex">
      <AdminSidebar userName={perfil?.nombre} logoUrl={marcaData?.logo_url} />
      <main className="flex-1 lg:pl-60 pt-14 lg:pt-0 p-4 sm:p-6 lg:p-8 min-h-screen">
        {children}
      </main>
    </div>
  )
}
