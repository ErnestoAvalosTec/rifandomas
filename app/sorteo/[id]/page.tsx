import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/public/Navbar'
import { Footer } from '@/components/public/Footer'
import { SorteoDetalle } from '@/components/public/SorteoDetalle'
import { anuncioGanador } from '@/lib/sorteoTexto'
import type { Database } from '@/types/database.types'

export const revalidate = 60

type SorteoRow = Database['public']['Tables']['sorteos']['Row']
type PremioRow = Database['public']['Tables']['premios']['Row']
type SorteoConPremios = SorteoRow & { premios: PremioRow[] }

const MARCA_SELECT = 'logo_url, topbar_activo, topbar_ubicacion, topbar_telefono, topbar_correo, topbar_redes, topbar_bg_color, topbar_text_color, topbar_icon_color, footer_bg_color, footer_text_color, footer_texto, footer_telefono, footer_correo, footer_redes, footer_links'

async function getSorteo(id: string): Promise<SorteoConPremios | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('sorteos')
    .select('*, premios(*)')
    .eq('id', id)
    .eq('estatus', 'activo')
    .single()
  return (data as SorteoConPremios | null) ?? null
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const sorteo = await getSorteo(params.id)
  if (!sorteo) return { title: 'Sorteo no encontrado | RifandoMas' }

  const premioPrincipal = sorteo.premios?.slice().sort((a, b) => a.lugar - b.lugar)[0]
  const titulo = `${sorteo.nombre} | RifandoMas`
  const base = premioPrincipal?.descripcion
    || sorteo.descripcion
    || `Participa en el sorteo "${sorteo.nombre}" y gana grandes premios. Boletos desde ${sorteo.precio_unitario} MXN.`
  const descripcion = `${base} ${anuncioGanador(!!(sorteo as any).es_loteria)}`
  const imagen = premioPrincipal?.imagen_url ?? undefined

  return {
    title: titulo,
    description: descripcion,
    openGraph: {
      title: titulo,
      description: descripcion,
      type: 'website',
      images: imagen ? [{ url: imagen, width: 800, height: 800, alt: sorteo.nombre }] : undefined,
    },
    twitter: {
      card: imagen ? 'summary_large_image' : 'summary',
      title: titulo,
      description: descripcion,
      images: imagen ? [imagen] : undefined,
    },
  }
}

function JsonLd({ sorteo, premioPrincipal }: {
  sorteo: SorteoConPremios
  premioPrincipal?: PremioRow
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: sorteo.nombre,
    description: sorteo.descripcion ?? `Participa en el sorteo "${sorteo.nombre}" y gana grandes premios.`,
    startDate: sorteo.fecha_sorteo,
    url: `https://rifandomas.com.mx/sorteo/${sorteo.id}`,
    ...(premioPrincipal?.imagen_url && { image: premioPrincipal.imagen_url }),
    organizer: {
      '@type': 'Organization',
      name: 'RifandoMas',
      url: 'https://rifandomas.com.mx',
    },
    offers: {
      '@type': 'Offer',
      price: String(sorteo.precio_unitario),
      priceCurrency: 'MXN',
      availability: 'https://schema.org/InStock',
      url: `https://rifandomas.com.mx/sorteo/${sorteo.id}`,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export default async function SorteoPage({ params }: { params: { id: string } }) {
  const sorteo = await getSorteo(params.id)
  if (!sorteo) notFound()

  const supabase = createClient()
  const sb = supabase as any
  // La RLS de `perfiles` solo permite leer el propio perfil (auth.uid() = id),
  // pero esta info del organizador es pública en la página del sorteo, así que
  // se consulta con el cliente admin (bypassa RLS) en lugar del cliente del visitante.
  const admin = createAdminSupabaseClient() as any

  const [{ data: marca }, { data: boletos }, { data: organizador }, { data: sorteosOrganizador }] = await Promise.all([
    sb.from('marca').select(MARCA_SELECT).eq('id', 1).single(),
    supabase.from('boletos').select('sorteo_id').eq('sorteo_id', sorteo.id).in('estatus', ['reservado', 'pagado']),
    admin.from('perfiles').select('nombre, apellidos, avatar_url, calificacion, verificado, created_at').eq('id', sorteo.usuario_id).single(),
    admin.from('sorteos').select('estatus').eq('usuario_id', sorteo.usuario_id),
  ])

  const sorteoConVendidos = { ...sorteo, boletos_vendidos: boletos?.length ?? 0 }
  const conteoOrganizador = {
    activos: sorteosOrganizador?.filter((s: any) => s.estatus === 'activo').length ?? 0,
    finalizados: sorteosOrganizador?.filter((s: any) => s.estatus === 'finalizado').length ?? 0,
  }

  const premioPrincipal = sorteo.premios?.slice().sort((a, b) => a.lugar - b.lugar)[0]

  return (
    <div className="min-h-screen bg-brand-bg">
      <JsonLd sorteo={sorteo} premioPrincipal={premioPrincipal} />
      <Navbar logoUrl={marca?.logo_url} topbar={marca} />
      <main>
        <SorteoDetalle sorteo={sorteoConVendidos} organizador={organizador} conteoOrganizador={conteoOrganizador} />
      </main>
      <Footer logoUrl={marca?.logo_url} footer={marca} />
    </div>
  )
}
