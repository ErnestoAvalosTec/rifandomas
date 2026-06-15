import { formatCurrency, formatDate } from '@/lib/utils'

const LUGAR_LABEL: Record<number, string> = { 1: '1er Premio', 2: '2do Premio', 3: '3er Premio' }

export function buildFacebookMessage(sorteo: any, premios: any[]): string {
  const premiosOrdenados = premios.slice().sort((a, b) => a.lugar - b.lugar)

  const lineas: string[] = [sorteo.nombre, '']

  if (sorteo.descripcion) lineas.push(sorteo.descripcion, '')

  if (premiosOrdenados.length) {
    lineas.push('Premios:')
    for (const p of premiosOrdenados) {
      const valor = p.valor_estimado ? ` (valor estimado: ${formatCurrency(p.valor_estimado)})` : ''
      lineas.push(`${LUGAR_LABEL[p.lugar] ?? `${p.lugar}° Premio`}: ${p.nombre}${valor}`)
    }
    lineas.push('')
  }

  lineas.push(
    `Precio por boleto: ${formatCurrency(sorteo.precio_unitario)}`,
    `Total de números: ${sorteo.total_numeros}`,
    `Fecha del sorteo: ${formatDate(sorteo.fecha_sorteo)}`,
    '',
    '¡Participa ahora!',
  )

  return lineas.join('\n')
}

export async function publicarEnFacebook(sorteo: any, premios: any[]): Promise<{ ok: boolean; error?: string }> {
  const pageId = process.env.FACEBOOK_PAGE_ID
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  if (!pageId || !token) {
    return { ok: false, error: 'Facebook no está configurado en el servidor' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rifandomas.com'
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
