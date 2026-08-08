import { formatCurrency, formatDate } from '@/lib/utils'

const LUGAR_LABEL: Record<number, string> = { 1: '1er Premio', 2: '2do Premio', 3: '3er Premio' }

// Meta penalizó la página por usar "sorteo"/"rifa" en publicaciones — el negocio se posiciona
// como venta de boletos, no como sorteos. Estas palabras vienen de texto libre que el admin
// escribe por campaña (nombre, descripción, premios), así que se filtran aquí antes de publicar,
// sin tocar cómo se muestran esos mismos textos dentro del sitio.
const REEMPLAZOS_FACEBOOK: [RegExp, string][] = [
  [/\brifas\b/gi, 'promociones'],
  [/\brifa\b/gi, 'promoción'],
  [/\brifando\b/gi, 'participando'],
  [/\brifar\b/gi, 'participar'],
  [/\bsorteos\b/gi, 'eventos'],
  [/\bsorteo\b/gi, 'evento'],
  [/\bsorteando\b/gi, 'eligiendo'],
  [/\bsortear\b/gi, 'elegir'],
  [/\bsorteas\b/gi, 'eliges'],
  [/\bsortea\b/gi, 'elige'],
  [/\bsorteamos\b/gi, 'elegimos'],
  [/\bsortean\b/gi, 'eligen'],
]

function conMayusculasComo(original: string, reemplazo: string): string {
  if (original === original.toUpperCase()) return reemplazo.toUpperCase()
  if (original[0] === original[0]?.toUpperCase()) return reemplazo[0].toUpperCase() + reemplazo.slice(1)
  return reemplazo
}

function sanitizarParaFacebook(texto: string): string {
  return REEMPLAZOS_FACEBOOK.reduce(
    (acc, [patron, reemplazo]) => acc.replace(patron, (match) => conMayusculasComo(match, reemplazo)),
    texto
  )
}

export function buildFacebookMessage(sorteo: any, premios: any[]): string {
  const premiosOrdenados = premios.slice().sort((a, b) => a.lugar - b.lugar)

  const nombre = sanitizarParaFacebook(sorteo.nombre ?? '')
  const descripcion = sorteo.descripcion ? sanitizarParaFacebook(sorteo.descripcion) : ''

  const lineas: string[] = [nombre, '']

  if (descripcion) lineas.push(descripcion, '')

  if (premiosOrdenados.length) {
    lineas.push('Premios:')
    for (const p of premiosOrdenados) {
      const valor = p.valor_estimado ? ` (valor estimado: ${formatCurrency(p.valor_estimado)})` : ''
      const nombrePremio = sanitizarParaFacebook(p.nombre ?? '')
      lineas.push(`${LUGAR_LABEL[p.lugar] ?? `${p.lugar}° Premio`}: ${nombrePremio}${valor}`)
    }
    lineas.push('')
  }

  lineas.push(
    `Precio por boleto: ${formatCurrency(sorteo.precio_unitario)}`,
    `Total de números: ${sorteo.total_numeros}`,
    `Fecha del evento: ${formatDate(sorteo.fecha_sorteo)}`,
    '',
    '¡Consigue tu boleto ahora!',
  )

  return lineas.join('\n')
}

export async function publicarEnFacebook(sorteo: any, premios: any[]): Promise<{ ok: boolean; error?: string }> {
  const pageId = process.env.FACEBOOK_PAGE_ID
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  if (!pageId || !token) {
    return { ok: false, error: 'Facebook no está configurado en el servidor' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rifandomas.com.mx'
  const params = new URLSearchParams({
    message: buildFacebookMessage(sorteo, premios),
    link: `${siteUrl}/sorteo/${sorteo.id}`,
    access_token: token,
  })

  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: 'POST',
    body: params,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    console.error('[facebook] post error:', data)
    return { ok: false, error: data?.error?.message ?? 'Error al publicar en Facebook' }
  }

  return { ok: true }
}
