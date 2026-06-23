import { MetadataRoute } from 'next'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminSupabaseClient() as any
  const { data: sorteos } = await supabase
    .from('sorteos')
    .select('id, updated_at')
    .eq('estatus', 'activo')

  const sorteoEntries: MetadataRoute.Sitemap = ((sorteos ?? []) as { id: string; updated_at: string }[]).map((s) => ({
    url: `https://rifandomas.com.mx/sorteo/${s.id}`,
    lastModified: new Date(s.updated_at),
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  return [
    {
      url: 'https://rifandomas.com.mx',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...sorteoEntries,
  ]
}
