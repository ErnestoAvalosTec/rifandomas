import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/public/Navbar'
import { HeroSection } from '@/components/public/HeroSection'
import { SorteosGrid } from '@/components/public/SorteosGrid'
import { Footer } from '@/components/public/Footer'
import type { Database } from '@/types/database.types'

export const revalidate = 60

type SorteoRow = Database['public']['Tables']['sorteos']['Row']
type PremioRow = Database['public']['Tables']['premios']['Row']

export default async function HomePage() {
  const supabase = createClient()
  const sb = supabase as any

  // Fetch marca (logo, favicon, topbar)
  const { data: marca } = await sb.from('marca')
    .select('logo_url, favicon_url, topbar_activo, topbar_ubicacion, topbar_telefono, topbar_correo, topbar_redes, topbar_bg_color, topbar_text_color, topbar_icon_color')
    .eq('id', 1).single()

  // Fetch all active sorteos
  const { data: sorteos } = await supabase
    .from('sorteos')
    .select('*, premios(*)')
    .eq('estatus', 'activo')
    .order('created_at', { ascending: false })

  const sorteoTyped = (sorteos ?? []) as (SorteoRow & { premios: PremioRow[] })[]
  const sorteoIds = sorteoTyped.map((s) => s.id)

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
      .eq('destacado', true)
      .limit(1)
      .single(),
  ])

  const vendidosPorSorteo: Record<string, number> = {}
  ;((boletoResult.data ?? []) as { sorteo_id: string }[]).forEach((b) => {
    vendidosPorSorteo[b.sorteo_id] = (vendidosPorSorteo[b.sorteo_id] ?? 0) + 1
  })

  const sorteosConVendidos = sorteoTyped.map((s) => ({
    ...s,
    boletos_vendidos: vendidosPorSorteo[s.id] ?? 0,
  }))

  // Build sorteo destacado with boletos count
  const destacadoRaw = destacadoResult.data ?? null
  const sorteoDestacado = destacadoRaw
    ? { ...destacadoRaw, boletos_vendidos: vendidosPorSorteo[destacadoRaw.id] ?? 0 }
    : null

  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar logoUrl={marca?.logo_url} topbar={marca} />
      <main>
        <HeroSection
          slides={slidesResult.data ?? []}
          sorteoDestacado={sorteoDestacado}
        />
        <SorteosGrid sorteos={sorteosConVendidos} />
      </main>
      <Footer />
    </div>
  )
}
