import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createAdminSupabaseClient()
  const { data } = await supabase
    .from('marca')
    .select('logo_url, favicon_url, topbar_activo, topbar_ubicacion, topbar_telefono, topbar_correo, topbar_redes, topbar_bg_color, topbar_text_color, topbar_icon_color')
    .eq('id', 1)
    .single()
  return NextResponse.json(data ?? {
    logo_url: null, favicon_url: null,
    topbar_activo: true, topbar_ubicacion: null,
    topbar_telefono: null, topbar_correo: null, topbar_redes: [],
  })
}
