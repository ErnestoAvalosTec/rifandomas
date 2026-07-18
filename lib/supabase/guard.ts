import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function requireAuth(): Promise<{ userId: string; error: null } | { userId: null; error: NextResponse }> {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { userId: null, error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  return { userId: user.id, error: null }
}

export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'admin') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  return null
}

export async function requireSorteoAccess(
  sorteoId: string
): Promise<{ userId: string; error: null } | { userId: null; error: NextResponse }> {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { userId: null, error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol === 'admin') {
    return { userId: user.id, error: null }
  }

  const { data: sorteo } = await (supabase as any)
    .from('sorteos')
    .select('usuario_id')
    .eq('id', sorteoId)
    .single()

  if (sorteo?.usuario_id === user.id) {
    return { userId: user.id, error: null }
  }

  return { userId: null, error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) }
}
