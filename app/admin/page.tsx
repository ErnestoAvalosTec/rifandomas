import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { Ticket, Users, Clock } from 'lucide-react'

export default async function AdminPage() {
  const supabase = createClient()

  const [{ data: pendientes }, { data: usuarios }, { data: activos }] = await Promise.all([
    supabase.from('sorteos').select('id').eq('estatus', 'pendiente'),
    supabase.from('perfiles').select('id'),
    supabase.from('sorteos').select('id').eq('estatus', 'activo'),
  ])

  const stats = [
    { label: 'Sorteos pendientes', value: pendientes?.length ?? 0, icon: Clock, color: 'text-yellow-400', href: '/admin/sorteos' },
    { label: 'Sorteos activos', value: activos?.length ?? 0, icon: Ticket, color: 'text-brand-green', href: '/admin/sorteos' },
    { label: 'Usuarios totales', value: usuarios?.length ?? 0, icon: Users, color: 'text-primary', href: '/admin/usuarios' },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-title text-4xl text-white tracking-wide">PANEL ADMIN</h1>
        <p className="text-brand-muted font-body text-sm">Gestión completa de la plataforma.</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href} className="bg-brand-card border border-brand-border rounded-2xl p-5 hover:border-primary/30 transition-colors">
            <Icon className={`w-5 h-5 mb-3 ${color}`} />
            <p className="font-title text-3xl text-white">{value}</p>
            <p className="text-xs text-brand-muted font-ui mt-1">{label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
