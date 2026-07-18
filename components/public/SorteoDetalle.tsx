'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, ZoomIn } from 'lucide-react'
import { SorteoCard } from './SorteoCard'
import { FormularioCompra } from './FormularioCompra'
import { OrganizadorInfo } from './OrganizadorInfo'
import { anuncioGanador } from '@/lib/sorteoTexto'
import { SeccionPreguntas } from './SeccionPreguntas'
import { SorteosRelacionados } from './SorteosRelacionados'
import { VerificadorBoleto } from './VerificadorBoleto'
import { SeccionGanadores } from './SeccionGanadores'
import type { Database } from '@/types/database.types'

type Sorteo = Database['public']['Tables']['sorteos']['Row'] & {
  premios: Database['public']['Tables']['premios']['Row'][]
  boletos_vendidos?: number
}

type Organizador = Pick<Database['public']['Tables']['perfiles']['Row'], 'nombre' | 'apellidos' | 'avatar_url' | 'calificacion' | 'verificado' | 'created_at'>

interface Paquete {
  cantidad: number
  label: string
  destacado?: boolean
}

interface ConteoOrganizador {
  activos: number
  finalizados: number
}

const LUGAR_LABEL: Record<number, string> = { 1: '1er', 2: '2do', 3: '3er' }

function GaleriaFotos({ premios }: { premios: Database['public']['Tables']['premios']['Row'][] }) {
  const [lightbox, setLightbox] = useState<string | null>(null)

  const premiosConFotos = premios
    .map((p) => ({
      ...p,
      fotos_urls: (p.fotos_urls ?? []).filter((url) => url !== p.imagen_url),
    }))
    .filter((p) => p.fotos_urls.length > 0)
    .sort((a, b) => a.lugar - b.lugar)

  if (!premiosConFotos.length) return null

  return (
    <>
      <div
        className="max-w-2xl mx-auto px-4 mt-14"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 48 }}
      >
        <h2
          className="font-title text-white text-center mb-8"
          style={{ fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', letterSpacing: '0.05em' }}
        >
          FOTOS DEL PREMIO
        </h2>

        <div className="space-y-8">
          {premiosConFotos.map((premio) => (
            <div key={premio.id}>
              {premiosConFotos.length > 1 && (
                <p
                  className="text-xs font-ui font-semibold uppercase tracking-widest mb-3"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  {LUGAR_LABEL[premio.lugar]} Premio — {premio.nombre}
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {premio.fotos_urls.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLightbox(url)}
                    className="relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    style={{ aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: '#1a1a1a', display: 'block', width: '100%' }}
                    aria-label={`Ver foto ${idx + 1} de ${premio.nombre}`}
                  >
                    <Image
                      src={url}
                      fill
                      sizes="(max-width: 640px) 45vw, 30vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      alt={`${premio.nombre} — foto ${idx + 1}`}
                      unoptimized
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ background: 'rgba(0,0,0,0.45)' }}
                    >
                      <ZoomIn className="w-6 h-6 text-white" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.1)' }}
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="relative w-full max-w-2xl"
            style={{ maxHeight: '85vh', aspectRatio: '1' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={lightbox}
              fill
              sizes="(max-width: 768px) 95vw, 672px"
              className="object-contain rounded-2xl"
              alt="Vista ampliada"
              unoptimized
            />
          </div>
        </div>
      )}
    </>
  )
}

interface GanadorInfo {
  premio_id: string
  numero_ganador: string
  evidencia_urls: string[]
  nombre_corto: string | null
  link_externo: string | null
}

export function SorteoDetalle({
  sorteo, organizador, conteoOrganizador, ganadores = [],
}: {
  sorteo: Sorteo
  organizador?: Organizador | null
  conteoOrganizador?: ConteoOrganizador
  ganadores?: GanadorInfo[]
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState<Paquete | null>(null)

  const handleParticipar = (_sorteo: Sorteo, paquete: Paquete) => {
    setPaqueteSeleccionado(paquete)
    setModalOpen(true)
  }

  const esLoteria = !!(sorteo as any).es_loteria
  const finalizado = sorteo.estatus === 'finalizado'

  return (
    <section className="py-12 sm:py-16" style={{ background: '#1c1c1c' }}>
      {/* Encabezado dinámico — nombre y descripción del sorteo */}
      <div className="max-w-lg mx-auto px-4 text-center mb-8 sm:mb-10">
        <h1
          className="font-title text-white"
          style={{ fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', letterSpacing: '0.02em', marginBottom: 10, lineHeight: 1.2 }}
        >
          {sorteo.nombre}
        </h1>

        {sorteo.descripcion && (
          <p className="font-body" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
            {sorteo.descripcion}
          </p>
        )}

        {!finalizado && (
          <div
            className="inline-flex items-start gap-2.5 mx-auto text-left"
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, padding: '10px 14px', maxWidth: 440,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{esLoteria ? '🎰' : '📱'}</span>
            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12.5, lineHeight: 1.55 }}>
              {anuncioGanador(esLoteria)}
            </span>
          </div>
        )}
      </div>

      <div className="max-w-sm mx-auto px-4">
        <SorteoCard sorteo={sorteo} onParticipar={handleParticipar} finalizado={finalizado} />
      </div>

      <GaleriaFotos premios={sorteo.premios} />

      {finalizado && <SeccionGanadores premios={sorteo.premios} ganadores={ganadores} />}

      {organizador && (
        <OrganizadorInfo organizador={organizador} conteo={conteoOrganizador ?? { activos: 0, finalizados: 0 }} />
      )}

      <SeccionPreguntas sorteoId={sorteo.id} soloLectura={finalizado} />

      <SorteosRelacionados sorteoId={sorteo.id} />

      {!finalizado && <VerificadorBoleto sorteos={[{ id: sorteo.id, nombre: sorteo.nombre }]} />}

      {!finalizado && paqueteSeleccionado && (
        <FormularioCompra
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          sorteo={sorteo}
          paqueteInicial={paqueteSeleccionado}
        />
      )}
    </section>
  )
}
