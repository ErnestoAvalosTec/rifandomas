'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Ticket, LayoutDashboard, Users, LogOut, ShoppingCart,
  ImageIcon, Palette, MessageCircle, Menu, X, ChevronRight,
} from 'lucide-react'

const ADMIN_NAV = [
  { href: '/admin',           label: 'Panel',      icon: LayoutDashboard, exact: true },
  { href: '/admin/sorteos',   label: 'Sorteos',    icon: Ticket },
  { href: '/admin/ordenes',   label: 'Órdenes',    icon: ShoppingCart },
  { href: '/admin/usuarios',  label: 'Usuarios',   icon: Users },
  { href: '/admin/hero',      label: 'Hero',       icon: ImageIcon },
  { href: '/admin/marca',     label: 'Marca',      icon: Palette },
  { href: '/admin/whatsapp',  label: 'WhatsApp',   icon: MessageCircle },
]

interface AdminSidebarProps {
  userName?: string | null
  logoUrl?: string | null
}

export function AdminSidebar({ userName, logoUrl }: AdminSidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (item: typeof ADMIN_NAV[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  const NavContent = ({ onNav }: { onNav?: () => void }) => (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-brand-border">
        {logoUrl ? (
          <div className="flex items-center gap-2 min-w-0">
            <Image
              src={logoUrl}
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
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Ticket className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-title text-lg text-brand-text leading-none">
                RIFANDO<span className="text-brand-red">MAS</span>
              </p>
              <p className="text-[10px] text-brand-red font-ui font-semibold">ADMIN</p>
            </div>
          </>
        )}
      </div>

      {/* Links */}
      <ul className="flex-1 px-3 py-4 space-y-1" role="navigation">
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNav}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-ui font-medium transition-all duration-200',
                  active
                    ? 'bg-primary/15 text-primary border border-primary/20'
                    : 'text-brand-muted hover:bg-brand-card hover:text-brand-text'
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

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-brand-border">
        {userName && (
          <p className="text-xs text-brand-muted font-ui px-3 mb-2 truncate">{userName}</p>
        )}
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-ui font-medium text-brand-muted hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-brand-bg border-r border-brand-border fixed inset-y-0 left-0 z-30">
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center gap-3 h-14 px-4 bg-brand-bg border-b border-brand-border">
        <button
          className="p-2 -ml-2 text-brand-muted hover:text-brand-text transition-colors cursor-pointer flex-shrink-0"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menú"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2 min-w-0">
          {logoUrl ? (
            <Image src={logoUrl} alt="Logo" width={90} height={28} className="object-contain max-h-7 w-auto" unoptimized />
          ) : (
            <span className="font-title text-lg text-brand-text truncate">
              RIFANDO<span className="text-brand-red">MAS</span>
            </span>
          )}
          <span className="text-[10px] text-brand-red font-ui font-semibold flex-shrink-0">ADMIN</span>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-brand-bg border-r border-brand-border flex flex-col">
            <NavContent onNav={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
