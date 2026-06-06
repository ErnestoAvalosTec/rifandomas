'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Ticket, Plus, ShoppingCart, Settings,
  LogOut, Menu, X, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'

const NAV_ITEMS = [
  { href: '/dashboard',           icon: LayoutDashboard, label: 'Inicio',        exact: true },
  { href: '/dashboard/sorteos',   icon: Ticket,          label: 'Mis Sorteos' },
  { href: '/dashboard/sorteos/nuevo', icon: Plus,        label: 'Crear Sorteo' },
  { href: '/dashboard/ordenes',   icon: ShoppingCart,    label: 'Órdenes' },
  { href: '/dashboard/configuracion', icon: Settings,    label: 'Configuración' },
]

interface SidebarProps {
  userName?: string
}

export function Sidebar({ userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  const logout = async () => {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    router.push('/')
    router.refresh()
  }

  const isActive = (item: typeof NAV_ITEMS[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  const NavContent = () => (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-brand-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Ticket className="w-4 h-4 text-white" />
        </div>
        <span className="font-title text-xl text-white">
          RIFANDO<span className="text-brand-red">MAS</span>
        </span>
      </div>

      {/* User */}
      {userName && (
        <div className="px-4 py-3 border-b border-brand-border">
          <p className="text-xs text-brand-muted font-ui">Hola,</p>
          <p className="text-sm font-semibold text-white font-ui truncate">{userName}</p>
        </div>
      )}

      {/* Links */}
      <ul className="flex-1 px-3 py-4 space-y-1" role="navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-ui font-medium transition-all duration-200',
                  active
                    ? 'bg-primary/15 text-primary border border-primary/20'
                    : 'text-brand-muted hover:bg-brand-card hover:text-white'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-primary' : '')} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3 h-3" />}
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-brand-border">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-ui font-medium text-brand-muted hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-brand-bg border-r border-brand-border fixed inset-y-0 left-0 z-30">
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between h-14 px-4 bg-brand-bg border-b border-brand-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Ticket className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-title text-lg text-white">RIFANDO<span className="text-brand-red">MAS</span></span>
        </div>
        <button
          className="p-2 text-brand-muted hover:text-white transition-colors cursor-pointer"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menú"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-brand-bg border-r border-brand-border flex flex-col">
            <NavContent />
          </aside>
        </div>
      )}
    </>
  )
}
