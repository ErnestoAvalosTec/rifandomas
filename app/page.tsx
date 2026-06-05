import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/public/Navbar'
import { HeroSection } from '@/components/public/HeroSection'
import { SorteosGrid } from '@/components/public/SorteosGrid'
import { ComoFunciona } from '@/components/public/ComoFunciona'
import { VerificadorBoleto } from '@/components/public/VerificadorBoleto'
import { FAQ } from '@/components/public/FAQ'
import { Footer } from '@/components/public/Footer'
import type { Database } from '@/types/database.types'

export const revalidate = 60

type SorteoRow = Database['public']['Tables']['sorteos']['Row']
type PremioRow = Database['public']['Tables']['premios']['Row']

export default async function HomePage() {
  const supabase = createClient()

  const { data: sorteos } = await supabase
    .from('sorteos')
    .select('*, premios(*)')
    .eq('estatus', 'activo')
    .order('created_at', { ascending: false })

  const sorteoTyped = (sorteos ?? []) as (SorteoRow & { premios: PremioRow[] })[]
  const sorteoIds = sorteoTyped.map((s) => s.id)

  const { data: boletoData } = sorteoIds.length
    ? await supabase
        .from('boletos')
        .select('sorteo_id')
        .in('sorteo_id', sorteoIds)
        .in('estatus', ['reservado', 'pagado'])
    : { data: [] }

  const vendidosPorSorteo: Record<string, number> = {}
  ;(boletoData ?? []).forEach((b: { sorteo_id: string }) => {
    vendidosPorSorteo[b.sorteo_id] = (vendidosPorSorteo[b.sorteo_id] ?? 0) + 1
  })

  const sorteosConVendidos = sorteoTyped.map((s) => ({
    ...s,
    boletos_vendidos: vendidosPorSorteo[s.id] ?? 0,
  }))

  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar />
      <main>
        <HeroSection />
        <SorteosGrid sorteos={sorteosConVendidos} />
        <ComoFunciona />
        <VerificadorBoleto />
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}
