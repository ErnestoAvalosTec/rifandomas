import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/public/Navbar'
import { HeroSection } from '@/components/public/HeroSection'
import { SorteosGrid } from '@/components/public/SorteosGrid'
import { SorteosFinalizadosGrid } from '@/components/public/SorteosFinalizadosGrid'
import { VerificadorBoleto } from '@/components/public/VerificadorBoleto'
import { Footer } from '@/components/public/Footer'
import type { Database } from '@/types/database.types'

export const revalidate = 60

type SorteoRow = Database['public']['Tables']['sorteos']['Row']
type PremioRow = Database['public']['Tables']['premios']['Row']

export default async function HomePage() {
  const supabase = createClient()
  const sb = supabase as any

  // Fetch marca (logo, favicon, topbar, cta banner)
  const { data: marca } = await sb.from('marca')
    .select('logo_url, favicon_url, cta_banner_url, topbar_activo, topbar_ubicacion, topbar_telefono, topbar_correo, topbar_redes, topbar_bg_color, topbar_text_color, topbar_icon_color, footer_bg_color, footer_text_color, footer_texto, footer_telefono, footer_correo, footer_redes, footer_links')
    .eq('id', 1).single()

  // Fetch all active sorteos
  const { data: sorteos } = await supabase
    .from('sorteos')
    .select('*, premios(*)')
    .eq('estatus', 'activo')
    .order('created_at', { ascending: false })

  const { data: sorteosFinalizados } = await supabase
    .from('sorteos')
    .select('*, premios(*)')
    .eq('estatus', 'finalizado')
    .order('fecha_sorteo', { ascending: false })
    .limit(12)

  const sorteoTyped = (sorteos ?? []) as (SorteoRow & { premios: PremioRow[] })[]
  const finalizadosTyped = (sorteosFinalizados ?? []) as (SorteoRow & { premios: PremioRow[] })[]
  const sorteoIds = [...sorteoTyped.map((s) => s.id), ...finalizadosTyped.map((s) => s.id)]

  // Fetch boletos vendidos + hero data in parallel
  const [boletoResult, slidesResult, destacadoResult] = await Promise.all([
    sorteoIds.length
      ? supabase.from('boletos').select('sorteo_id').in('sorteo_id', sorteoIds).in('estatus', ['reservado', 'pagado'])
      : Promise.resolve({ data: [] }),

    sb.from('hero_slides')
      .select('id, imagen_url, titulo')
      .eq('activo', true)
      .order('orden', { ascending: true }),

    sb.from('sorteos')
      .select('id, nombre, precio_unitario, total_numeros, fecha_sorteo, premios(lugar, nombre, imagen_url, valor_estimado)')
      .eq('estatus', 'activo')
      .not('destacado_orden', 'is', null)
      .order('destacado_orden', { ascending: true })
      .limit(3),
  ])

  const vendidosPorSorteo: Record<string, number> = {}
  ;((boletoResult.data ?? []) as { sorteo_id: string }[]).forEach((b) => {
    vendidosPorSorteo[b.sorteo_id] = (vendidosPorSorteo[b.sorteo_id] ?? 0) + 1
  })

  const sorteosConVendidos = sorteoTyped.map((s) => ({
    ...s,
    boletos_vendidos: vendidosPorSorteo[s.id] ?? 0,
  }))

  const finalizadosConVendidos = finalizadosTyped.map((s) => ({
    ...s,
    boletos_vendidos: vendidosPorSorteo[s.id] ?? 0,
  }))

  // Build sorteos destacados (hasta 3) con su conteo de boletos vendidos
  const destacadosRaw = (destacadoResult.data ?? []) as any[]
  const sorteosDestacados = destacadosRaw.map((d) => ({
    ...d,
    boletos_vendidos: vendidosPorSorteo[d.id] ?? 0,
  }))

  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar logoUrl={marca?.logo_url} topbar={marca} />
      <main>
        <HeroSection
          slides={slidesResult.data ?? []}
          sorteosDestacados={sorteosDestacados}
          ctaBannerUrl={marca?.cta_banner_url ?? null}
        />
        <SorteosGrid sorteos={sorteosConVendidos} />
        <SorteosFinalizadosGrid sorteos={finalizadosConVendidos} />
        <VerificadorBoleto sorteos={sorteoTyped.map((s) => ({ id: s.id, nombre: s.nombre }))} />
      </main>
      <Footer logoUrl={marca?.logo_url} footer={marca} />
    </div>
  )
}
