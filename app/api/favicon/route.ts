import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export const revalidate = 300 // refresca cada 5 minutos

export async function GET() {
  const supabase = createAdminSupabaseClient() as any
  const { data } = await supabase
    .from('marca')
    .select('favicon_url')
    .eq('id', 1)
    .single()

  if (data?.favicon_url) {
    return NextResponse.redirect(data.favicon_url)
  }

  // Fallback — redirige al favicon estático por defecto
  return NextResponse.redirect(new URL('/favicon.ico', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'))
}
