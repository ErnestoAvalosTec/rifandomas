'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Trophy, Loader2 } from 'lucide-react'
import { GanadoresManager } from '@/components/shared/GanadoresManager'

export function SorteoDetalleAcciones({ sorteoId, estatus }: { sorteoId: string; estatus: string }) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [ganadoresAbierto, setGanadoresAbierto] = useState(false)

  const finalizar = async () => {
    setFinalizando(true)
    const res = await fetch(`/api/sorteos/${sorteoId}/finalizar`, { method: 'POST' })
    const json = await res.json()
    setFinalizando(false)
    if (!res.ok) { toast.error(json.error ?? 'Error al finalizar el sorteo'); return }
    toast.success('Sorteo finalizado')
    setConfirmando(false)
    router.refresh()
  }

  if (estatus === 'activo') {
    return (
      <div className="rounded-xl border border-brand-border p-4">
        {!confirmando ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirmando(true)}
            className="gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-400"
          >
            <Trophy className="w-3.5 h-3.5" />Finalizar sorteo
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-brand-muted font-ui">
              El sorteo dejará de venderse y pasará a "Sorteos Finalizados" en la web pública. Podrás declarar los ganadores ahora o después.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmando(false)}>Cancelar</Button>
              <Button size="sm" disabled={finalizando} onClick={finalizar}>
                {finalizando && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                Confirmar finalización
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (estatus === 'finalizado') {
    return (
      <>
        <Button size="sm" onClick={() => setGanadoresAbierto(true)} className="gap-1.5">
          <Trophy className="w-3.5 h-3.5" />Gestionar ganadores
        </Button>
        <GanadoresManager sorteoId={sorteoId} open={ganadoresAbierto} onClose={() => setGanadoresAbierto(false)} />
      </>
    )
  }

  return null
}
