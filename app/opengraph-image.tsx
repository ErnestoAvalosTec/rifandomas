import { ImageResponse } from 'next/og'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const alt = 'RifandoMas — Sorteos y Rifas Virtuales en México'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const supabase = createAdminSupabaseClient()
  const { data: marca } = await supabase
    .from('marca')
    .select('logo_url')
    .eq('id', 1)
    .single()

  const logoUrl = marca?.logo_url ?? null

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#ffffff',
          borderTop: '14px solid #22C55E',
        }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt="RifandoMas"
            style={{ height: 110, marginBottom: 36, objectFit: 'contain' }}
          />
        ) : (
          <div style={{ fontSize: 72, fontWeight: 800, color: '#22C55E', marginBottom: 36 }}>
            RifandoMas
          </div>
        )}
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            color: '#111827',
            textAlign: 'center',
            marginBottom: 20,
            maxWidth: 900,
          }}
        >
          Sorteos y Rifas Virtuales en México
        </div>
        <div style={{ fontSize: 26, color: '#6b7280' }}>
          rifandomas.com.mx
        </div>
      </div>
    ),
    { ...size }
  )
}
