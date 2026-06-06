import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Ticket, LayoutDashboard, Users, LogOut, ShoppingCart, ImageIcon, Palette, MessageCircle } from 'lucide-react'
import type { Database } from '@/types/database.types'

type PerfilRow = Database['public']['Tables']['perfiles']['Row']

const ADMIN_NAV = [
  { href: '/admin', label: 'Panel', icon: LayoutDashboard },
  { href: '/admin/sorteos', label: 'Sorteos', icon: Ticket },
  { href: '/admin/ordenes', label: 'Órdenes', icon: ShoppingCart },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { href: '/admin/hero', label: 'Hero', icon: ImageIcon },
  { href: '/admin/marca', label: 'Marca', icon: Palette },
  { href: '/admin/whatsapp', label: 'WhatsApp', icon: MessageCircle },
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

  const { data: marcaData } = await (supabase as any)
    .from('marca').select('logo_url').eq('id', 1).single()

  return (
    <div className="min-h-screen bg-brand-bg flex">
      <aside className="w-60 bg-brand-bg border-r border-brand-border flex flex-col fixed inset-y-0 left-0 z-30">
        <div className="flex items-center gap-2 px-4 py-5 border-b border-brand-border">
          {marcaData?.logo_url ? (
            <div className="flex items-center gap-2 min-w-0">
              <Image
                src={marcaData.logo_url}
                alt="Logo"
                width={120}
                height={36}
                className="object-contain max-h-9 w-auto"
                unoptimized
              />
              <p className="text-[10px] text-brand-red font-ui font-semibold flex-shrink-0">ADMIN</p>
            </div>
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Ticket className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-title text-lg text-brand-text leading-none">RIFANDO<span className="text-brand-red">MAS</span></p>
                <p className="text-[10px] text-brand-red font-ui font-semibold">ADMIN</p>
              </div>
            </>
          )}
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-ui font-medium text-brand-muted hover:bg-brand-card hover:text-brand-text transition-all duration-200">
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-brand-border">
          <p className="text-xs text-brand-muted font-ui px-3 mb-2">{perfil?.nombre}</p>
          <Link href="/login" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-ui font-medium text-brand-muted hover:text-red-500 hover:bg-red-50 transition-all duration-200">
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </Link>
        </div>
      </aside>
      <main className="pl-60 flex-1 p-8">{children}</main>
    </div>
  )
}
