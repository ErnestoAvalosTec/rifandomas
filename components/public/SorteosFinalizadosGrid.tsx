'use client'

import { useRouter } from 'next/navigation'
import { SorteoCard } from './SorteoCard'
import type { Database } from '@/types/database.types'

type Sorteo = Database['public']['Tables']['sorteos']['Row'] & {
  premios: Database['public']['Tables']['premios']['Row'][]
  boletos_vendidos?: number
}

export function SorteosFinalizadosGrid({ sorteos }: { sorteos: Sorteo[] }) {
  const router = useRouter()

  if (!sorteos.length) return null

  return (
    <section className="py-16" style={{ background: '#1c1c1c', borderTop: '1px solid #3a3a3a' }}>
      <div className="max-w-7xl mx-auto px-2 sm:px-6">
        <div className="mb-8 sm:mb-10 text-center">
          <h2 className="font-title text-white" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', letterSpacing: '0.02em', marginBottom: 8 }}>
            SORTEOS FINALIZADOS
          </h2>
          <p className="font-body mx-auto" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(13px, 2vw, 15px)', maxWidth: 520 }}>
            Consulta los resultados y ganadores de nuestros sorteos ya realizados.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 items-start">
          {sorteos.map((sorteo) => (
            <div
              key={sorteo.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/sorteo/${sorteo.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/sorteo/${sorteo.id}`) }}
              className="cursor-pointer grayscale hover:grayscale-0 focus-visible:grayscale-0 transition-all duration-300 outline-none rounded-2xl"
            >
              <SorteoCard sorteo={sorteo} onParticipar={() => {}} finalizado />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
