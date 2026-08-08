'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Ticket } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function AuthLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient() as any
    supabase
      .from('marca')
      .select('logo_url')
      .eq('id', 1)
      .single()
      .then(({ data }: { data: { logo_url: string | null } | null }) => {
        setLogoUrl(data?.logo_url ?? null)
      })
  }, [])

  return (
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt="Logo"
            width={160}
            height={48}
            className="object-contain max-h-10 w-auto"
            unoptimized
          />
        ) : (
          <>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: '#0C9646',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Ticket style={{ width: 20, height: 20, color: '#fff' }} />
            </div>
            <span className="font-title" style={{ fontSize: 31, letterSpacing: '0.08em', color: '#fff' }}>
              RIFANDO<span style={{ color: '#0C9646' }}>MAS</span>
            </span>
          </>
        )}
      </Link>
    </div>
  )
}
