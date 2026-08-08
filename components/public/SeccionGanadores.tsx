'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Trophy, X, ZoomIn, ExternalLink } from 'lucide-react'
import type { Database } from '@/types/database.types'

type Premio = Database['public']['Tables']['premios']['Row']

interface GanadorInfo {
  premio_id: string
  numero_ganador: string
  evidencia_urls: string[]
  nombre_corto: string | null
  link_externo: string | null
}

const LUGAR_LABEL: Record<number, string> = { 1: '1er', 2: '2do', 3: '3er', 4: '4to', 5: '5to' }

export function SeccionGanadores({ premios, ganadores }: { premios: Premio[]; ganadores: GanadorInfo[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  const premiosOrdenados = premios.slice().sort((a, b) => a.lugar - b.lugar)

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 mt-14" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 48 }}>
        <h2 className="font-title text-white text-center mb-8" style={{ fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', letterSpacing: '0.05em' }}>
          GANADORES
        </h2>

        <div className="space-y-4">
          {premiosOrdenados.map((premio) => {
            const ganador = ganadores.find((g) => g.premio_id === premio.id)
            return (
              <div key={premio.id} className="flex items-start gap-4 p-4 rounded-xl" style={{ background: '#252525', border: '1px solid rgba(255,255,255,0.08)' }}>
                {premio.imagen_url ? (
                  <Image src={premio.imagen_url} alt={premio.nombre} width={64} height={64} className="rounded-lg object-contain bg-white p-1 flex-shrink-0" unoptimized />
                ) : (
                  <div className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <Trophy className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-ui font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {LUGAR_LABEL[premio.lugar] ?? `${premio.lugar}°`} Premio — {premio.nombre}
                  </p>

                  {ganador ? (
                    <>
                      <p className="text-white font-ui font-semibold text-sm mb-2">
                        🏆 {ganador.nombre_corto ?? 'Ganador'}
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}> — boleto #{ganador.numero_ganador}</span>
                      </p>
                      {ganador.evidencia_urls.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {ganador.evidencia_urls.map((url, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setLightbox(url)}
                              className="relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', background: '#1a1a1a' }}
                              aria-label={`Ver evidencia ${idx + 1}`}
                            >
                              <Image
                                src={url}
                                fill
                                sizes="56px"
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                alt={`Evidencia ${idx + 1}`}
                                unoptimized
                              />
                              <div
                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                style={{ background: 'rgba(0,0,0,0.45)' }}
                              >
                                <ZoomIn className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {ganador.link_externo && (
                        <a
                          href={ganador.link_externo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-2 text-xs font-ui font-semibold"
                          style={{ color: '#0C9646' }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Ver publicación
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Ganador por anunciar</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.92)' }} onClick={() => setLightbox(null)}>
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.1)' }}
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative w-full max-w-2xl" style={{ maxHeight: '85vh', aspectRatio: '1' }} onClick={(e) => e.stopPropagation()}>
            <Image src={lightbox} fill sizes="(max-width: 768px) 95vw, 672px" className="object-contain rounded-2xl" alt="Vista ampliada" unoptimized />
          </div>
        </div>
      )}
    </>
  )
}
