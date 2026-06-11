'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const POLL_MS = 30_000

/**
 * Cuenta de pedidos nuevos sin revisar desde la última visita a `ordenesPath`.
 * Al navegar a esa ruta se marca como visto (badge -> 0) y se persiste
 * `ultima_revision_ordenes` para que el conteo no reaparezca al recargar.
 */
export function useOrdenesBadge(ordenesPath: string): number {
  const pathname = usePathname()
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const cargarConteo = async () => {
      try {
        const res = await fetch('/api/notificaciones/ordenes')
        const json = await res.json()
        if (!cancelled) setCount(json.count ?? 0)
      } catch {
        // silencioso: el badge es informativo, no crítico
      }
    }

    if (pathname.startsWith(ordenesPath)) {
      setCount(0)
      fetch('/api/notificaciones/ordenes', { method: 'POST' }).catch(() => {})
    } else {
      cargarConteo()
    }

    const interval = setInterval(() => {
      if (!pathname.startsWith(ordenesPath)) cargarConteo()
    }, POLL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [pathname, ordenesPath])

  return count
}
