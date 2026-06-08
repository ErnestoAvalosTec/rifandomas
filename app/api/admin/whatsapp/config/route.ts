import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

// Evita que Next.js cachee esta ruta como estática y sirva una config vieja
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createAdminSupabaseClient()
  const { data } = await (supabase as any)
    .from('whatsapp_config')
    .select('api_url, api_key, instance_name, activo')
    .eq('id', 1)
    .single()
  return NextResponse.json(data ?? {})
}

export async function POST(req: NextRequest) {
  const supabase = createAdminSupabaseClient()
  const body = await req.json()
  const { api_url, api_key, instance_name } = body

  const { error } = await (supabase as any)
    .from('whatsapp_config')
    .upsert({
      id: 1,
      api_url: api_url ?? null,
      api_key: api_key ?? null,
      instance_name: instance_name || 'rifandoplus',
      updated_at: new Date().toISOString(),
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
