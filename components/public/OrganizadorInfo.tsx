import { Star, Check } from 'lucide-react'
import { antiguedadEnPlataforma, esNuevoUsuario } from '@/lib/sorteoTexto'

interface Organizador {
  nombre: string
  apellidos: string
  avatar_url: string | null
  calificacion: number
  verificado: boolean
  created_at: string
}

interface ConteoOrganizador {
  activos: number
  finalizados: number
}

export function OrganizadorInfo({ organizador, conteo }: { organizador: Organizador | null; conteo: ConteoOrganizador }) {
  if (!organizador) return null

  const nombreCompleto = `${organizador.nombre} ${organizador.apellidos}`.trim()
  const iniciales = `${organizador.nombre?.[0] ?? ''}${organizador.apellidos?.[0] ?? ''}`.toUpperCase()
  const nuevo = esNuevoUsuario(organizador.created_at)

  return (
    <div className="max-w-sm mx-auto px-4 mt-6">
      <div
        style={{
          background: '#252525',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          padding: 20,
        }}
      >
        <p className="font-ui" style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
          Organizado por
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
            {organizador.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={organizador.avatar_url}
                alt={nombreCompleto}
                style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            ) : (
              <div
                style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(12, 150, 70,0.12)', border: '1px solid rgba(12, 150, 70,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#0C9646', fontWeight: 700, fontSize: 21,
                }}
                className="font-ui"
              >
                {iniciales || '?'}
              </div>
            )}
            {organizador.verificado && (
              <span
                title="Perfil verificado"
                style={{
                  position: 'absolute', bottom: -2, right: -2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#3B82F6', border: '2px solid #252525',
                }}
              >
                <Check style={{ width: 11, height: 11, color: '#fff' }} strokeWidth={3} />
              </span>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <p
                className="font-ui text-white"
                style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}
              >
                {nombreCompleto}
              </p>
              {nuevo && (
                <span
                  className="font-ui"
                  style={{
                    display: 'inline-flex', alignItems: 'center',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em',
                    borderRadius: 999, padding: '2px 6px', textTransform: 'uppercase',
                    flexShrink: 0, whiteSpace: 'nowrap',
                  }}
                >
                  Nuevo
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Star style={{ width: 13, height: 13, color: '#FACC15', fill: '#FACC15' }} />
              <span className="font-ui" style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                {organizador.calificacion.toFixed(1)}
              </span>
              <span className="font-body" style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)' }}>
                · {antiguedadEnPlataforma(organizador.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
            <p className="font-title text-white" style={{ fontSize: 23, lineHeight: 1.1 }}>{conteo.activos}</p>
            <p className="font-ui" style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>
              Sorteos activos
            </p>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
            <p className="font-title text-white" style={{ fontSize: 23, lineHeight: 1.1 }}>{conteo.finalizados}</p>
            <p className="font-ui" style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>
              Sorteos finalizados
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
