import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Ticket, LayoutDashboard, Users, LogOut } from 'lucide-react'
import type { Database } from '@/types/database.types'

type PerfilRow = Database['public']['Tables']['perfiles']['Row']

const ADMIN_NAV = [
  { href: '/admin', label: 'Panel', icon: LayoutDashboard },
  { href: '/admin/sorteos', label: 'Sorteos', icon: Ticket },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
]

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

  return (
    <div className="min-h-screen bg-brand-bg flex">
      <aside className="w-60 bg-brand-card border-r border-brand-border flex flex-col fixed inset-y-0 left-0 z-30">
        <div className="flex items-center gap-2 px-4 py-5 border-b border-brand-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Ticket className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-title text-lg tracking-wider text-white leading-none">RIFANDO<span className="text-primary">+</span></p>
            <p className="text-[10px] text-primary font-ui">ADMIN</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-ui text-brand-muted hover:bg-brand-border/40 hover:text-white transition-all duration-200">
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-brand-border">
          <p className="text-xs text-brand-muted font-ui px-3 mb-2">{perfil?.nombre}</p>
          <Link href="/login" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-ui text-brand-muted hover:text-red-400 hover:bg-red-500/10 transition-all duration-200">
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </Link>
        </div>
      </aside>
      <main className="pl-60 flex-1 p-8">{children}</main>
    </div>
  )
}
