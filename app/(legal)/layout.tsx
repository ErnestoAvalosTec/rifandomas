import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/public/Navbar'
import { Footer } from '@/components/public/Footer'

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const sb = createClient() as any
  const { data: marca } = await sb
    .from('marca')
    .select(
      'logo_url, topbar_activo, topbar_ubicacion, topbar_telefono, topbar_correo, topbar_redes, topbar_bg_color, topbar_text_color, topbar_icon_color, footer_bg_color, footer_text_color, footer_texto, footer_telefono, footer_correo, footer_redes, footer_links'
    )
    .eq('id', 1)
    .single()

  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar logoUrl={marca?.logo_url} topbar={marca} />
      <main>{children}</main>
      <Footer logoUrl={marca?.logo_url} footer={marca} />
    </div>
  )
}
