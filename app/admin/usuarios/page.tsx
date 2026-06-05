'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { UserCheck, UserX, ShieldCheck, Shield } from 'lucide-react'

interface Perfil {
  id: string
  nombre: string
  apellidos: string
  telefono: string | null
  rol: string
  activo: boolean
  created_at: string
}

export default function AdminUsuariosPage() {
  const supabase = createClient()
  const [perfiles, setPerfiles] = useState<Perfil[]>([])

  useEffect(() => {
    const cargar = async () => {
      const { data } = await (supabase as any).from('perfiles').select('*').order('created_at', { ascending: false })
      setPerfiles(data ?? [])
    }
    cargar()
  }, [])

  const toggleActivo = async (id: string, activo: boolean) => {
    const { error } = await (supabase as any).from('perfiles').update({ activo: !activo }).eq('id', id)
    if (!error) {
      setPerfiles((prev) => prev.map((p) => p.id === id ? { ...p, activo: !activo } : p))
      toast.success(activo ? 'Cuenta desactivada' : 'Cuenta activada')
    }
  }

  const toggleRol = async (id: string, rol: string) => {
    const nuevoRol = rol === 'admin' ? 'usuario' : 'admin'
    const { error } = await (supabase as any).from('perfiles').update({ rol: nuevoRol }).eq('id', id)
    if (!error) {
      setPerfiles((prev) => prev.map((p) => p.id === id ? { ...p, rol: nuevoRol } : p))
      toast.success(`Rol cambiado a "${nuevoRol}"`)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-title text-4xl text-white tracking-wide">USUARIOS</h1>
        <p className="text-brand-muted font-body text-sm">{perfiles.length} usuarios registrados</p>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border">
                {['Nombre', 'Teléfono', 'Rol', 'Estado', 'Registro', 'Acciones'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-brand-muted font-ui uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perfiles.map((p) => (
                <tr key={p.id} className="border-b border-brand-border/50 last:border-0 hover:bg-brand-border/20 transition-colors">
                  <td className="px-4 py-3 font-ui text-white">{p.nombre} {p.apellidos}</td>
                  <td className="px-4 py-3 text-brand-muted">{p.telefono ?? '—'}</td>
                  <td className="px-4 py-3"><Badge variant={p.rol === 'admin' ? 'default' : 'secondary'}>{p.rol}</Badge></td>
                  <td className="px-4 py-3"><Badge variant={p.activo ? 'activo' : 'rechazado'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                  <td className="px-4 py-3 text-brand-muted">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" className="w-8 h-8" title={p.activo ? 'Desactivar' : 'Activar'} onClick={() => toggleActivo(p.id, p.activo)}>
                        {p.activo ? <UserX className="w-3.5 h-3.5 text-red-400" /> : <UserCheck className="w-3.5 h-3.5 text-brand-green" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="w-8 h-8" title={p.rol === 'admin' ? 'Quitar admin' : 'Hacer admin'} onClick={() => toggleRol(p.id, p.rol)}>
                        {p.rol === 'admin' ? <Shield className="w-3.5 h-3.5 text-brand-muted" /> : <ShieldCheck className="w-3.5 h-3.5 text-primary" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
