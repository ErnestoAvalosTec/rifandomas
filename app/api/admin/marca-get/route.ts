import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/supabase/guard'

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminSupabaseClient()
  const { data } = await supabase
    .from('marca')
    .select('logo_url, favicon_url, cta_banner_url, topbar_activo, topbar_ubicacion, topbar_telefono, topbar_correo, topbar_redes, topbar_bg_color, topbar_text_color, topbar_icon_color, footer_bg_color, footer_text_color, footer_texto, footer_telefono, footer_correo, footer_redes, footer_links')
    .eq('id', 1)
    .single()
  return NextResponse.json(data ?? {
    logo_url: null, favicon_url: null, cta_banner_url: null,
    topbar_activo: true, topbar_ubicacion: null,
    topbar_telefono: null, topbar_correo: null, topbar_redes: [],
    footer_bg_color: '#1c1c1c', footer_text_color: '#9ca3af', footer_texto: null,
    footer_telefono: null, footer_correo: null, footer_redes: [], footer_links: [],
  })
}
