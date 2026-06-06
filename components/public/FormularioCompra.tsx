'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { SelectorNumeros } from './SelectorNumeros'
import { formatCurrency, ESTADOS_MEXICO } from '@/lib/utils'
import { CheckCircle2, Loader2 } from 'lucide-react'
import type { Database } from '@/types/database.types'

type Sorteo = Database['public']['Tables']['sorteos']['Row'] & {
  premios: Database['public']['Tables']['premios']['Row'][]
  boletos_vendidos?: number
}

interface Paquete {
  cantidad: number
  label: string
}

interface FormularioCompraProps {
  open: boolean
  onClose: () => void
  sorteo: Sorteo
  paqueteInicial: Paquete
}

const schemaCliente = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  apellido_paterno: z.string().min(2, 'Requerido'),
  apellido_materno: z.string().min(2, 'Requerido'),
  telefono: z.string().length(10, 'Ingresa 10 dígitos sin el código de país'),
  estado: z.string().min(1, 'Selecciona tu estado'),
  aviso_privacidad: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar el aviso' }) }),
})

type ClienteForm = z.infer<typeof schemaCliente>

const PASOS = ['Paquete', 'Tus datos', 'Elige números']

export function FormularioCompra({ open, onClose, sorteo, paqueteInicial }: FormularioCompraProps) {
  const [paso, setPaso] = useState(0)
  const [paquete, setPaquete] = useState<Paquete>(paqueteInicial)
  const [numerosSeleccionados, setNumerosSeleccionados] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [pedidoExitoso, setPedidoExitoso] = useState(false)
  const [datosCliente, setDatosCliente] = useState<ClienteForm | null>(null)

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<ClienteForm>({
    resolver: zodResolver(schemaCliente),
  })

  const handleClose = () => {
    if (enviando) return
    setPaso(0)
    setNumerosSeleccionados([])
    setPedidoExitoso(false)
    setDatosCliente(null)
    onClose()
  }

  const paquetesDisponibles = (() => {
    const precio = sorteo.precio_unitario
    if (sorteo.promo_activa && sorteo.promo_tipo === 'x_por_y' && sorteo.promo_config) {
      const cfg = sorteo.promo_config as { compra: number; paga: number }[]
      return cfg.map((p) => ({ cantidad: p.compra, label: `${p.compra} boletos — pagas ${p.paga} (${formatCurrency(precio * p.paga)})`, monto: precio * p.paga }))
    }
    return [
      { cantidad: 1, label: `1 boleto — ${formatCurrency(precio)}`, monto: precio },
      { cantidad: 3, label: `3 boletos — ${formatCurrency(precio * 3)}`, monto: precio * 3 },
      { cantidad: 5, label: `5 boletos — ${formatCurrency(precio * 5)}`, monto: precio * 5 },
      { cantidad: 10, label: `10 boletos — ${formatCurrency(precio * 10)}`, monto: precio * 10 },
    ]
  })()

  const paqueteActual = paquetesDisponibles.find((p) => p.cantidad === paquete.cantidad) ?? paquetesDisponibles[0]

  const terminarPedido = async () => {
    if (!datosCliente) return
    if (numerosSeleccionados.length < paquete.cantidad) {
      toast.error(`Selecciona ${paquete.cantidad} números para continuar.`)
      return
    }
    setEnviando(true)

    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sorteo_id: sorteo.id,
          usuario_id: sorteo.usuario_id,
          cliente_nombre: datosCliente.nombre,
          cliente_apellidos: `${datosCliente.apellido_paterno} ${datosCliente.apellido_materno}`,
          cliente_telefono: datosCliente.telefono,
          cliente_estado: datosCliente.estado,
          monto_total: paqueteActual.monto,
          numeros: numerosSeleccionados,
        }),
      })

      const json = await res.json()

      if (res.status === 409 && json.error === 'numeros_no_disponibles') {
        toast.error('Uno o más números ya fueron tomados. Por favor selecciona otros.', { duration: 6000 })
        setNumerosSeleccionados([])
        return
      }

      if (!res.ok) throw new Error(json.error ?? 'No se pudo crear el pedido.')

      const { pedidoId, cuenta } = json

      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono: datosCliente.telefono,
          nombre: datosCliente.nombre,
          sorteoNombre: sorteo.nombre,
          numeros: numerosSeleccionados,
          fechaSorteo: new Date(sorteo.fecha_sorteo).toLocaleDateString('es-MX'),
          montoTotal: paqueteActual.monto,
          banco: cuenta?.banco ?? 'Ver en plataforma',
          clabe: cuenta?.clabe ?? 'Ver en plataforma',
          titular: cuenta?.titular ?? 'Ver en plataforma',
          pedidoId,
        }),
      })

      setPedidoExitoso(true)
    } catch (err) {
      toast.error('Ocurrió un error. Por favor intenta de nuevo.')
      console.error(err)
    } finally {
      setEnviando(false)
    }
  }

  const onSubmitCliente = (data: ClienteForm) => {
    setDatosCliente(data)
    setPaso(2)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {pedidoExitoso ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-brand-green mx-auto mb-4" />
            <h2 className="font-title text-4xl text-white mb-2">¡PEDIDO REGISTRADO!</h2>
            <p className="text-brand-muted font-body mb-2">Revisa tu WhatsApp — te enviamos los datos de pago.</p>
            <p className="text-xs text-brand-muted font-body mb-6">
              Tienes <strong className="text-brand-gold">48 horas</strong> para realizar la transferencia.
            </p>
            <Button onClick={handleClose} size="lg" className="w-full">Cerrar</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-title text-3xl tracking-wide">
                PARTICIPAR EN <span className="text-primary">{sorteo.nombre.toUpperCase()}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="mt-2 mb-6">
              <div className="flex justify-between text-xs font-ui text-brand-muted mb-2">
                {PASOS.map((p, i) => (
                  <span key={p} className={i <= paso ? 'text-white font-semibold' : ''}>{p}</span>
                ))}
              </div>
              <Progress value={((paso + 1) / PASOS.length) * 100} />
            </div>

            {paso === 0 && (
              <div>
                <h3 className="font-ui font-semibold text-white mb-4">Elige tu paquete</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {paquetesDisponibles.map((pkg) => (
                    <button key={pkg.cantidad} onClick={() => setPaquete(pkg)} className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${paquete.cantidad === pkg.cantidad ? 'border-primary bg-primary/10' : 'border-brand-border bg-brand-border/20 hover:border-brand-muted'}`}>
                      <p className="font-ui font-semibold text-white text-sm">{pkg.cantidad} boleto{pkg.cantidad > 1 ? 's' : ''}</p>
                      <p className="text-brand-muted text-xs mt-0.5">{formatCurrency(pkg.monto)}</p>
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-brand-border/30 border border-brand-border mb-4">
                  <span className="font-ui text-brand-muted text-sm">Total a pagar:</span>
                  <span className="font-title text-2xl text-primary">{formatCurrency(paqueteActual.monto)}</span>
                </div>
                <Button size="lg" className="w-full" onClick={() => setPaso(1)}>Continuar →</Button>
              </div>
            )}

            {paso === 1 && (
              <form onSubmit={handleSubmit(onSubmitCliente)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nombre">Nombre(s)</Label>
                    <Input id="nombre" placeholder="Tu nombre" {...register('nombre')} />
                    {errors.nombre && <p className="text-xs text-red-400">{errors.nombre.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ap_paterno">Apellido Paterno</Label>
                    <Input id="ap_paterno" placeholder="Apellido paterno" {...register('apellido_paterno')} />
                    {errors.apellido_paterno && <p className="text-xs text-red-400">{errors.apellido_paterno.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ap_materno">Apellido Materno</Label>
                    <Input id="ap_materno" placeholder="Apellido materno" {...register('apellido_materno')} />
                    {errors.apellido_materno && <p className="text-xs text-red-400">{errors.apellido_materno.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="telefono">Teléfono WhatsApp</Label>
                    <div className="flex gap-2">
                      <span className="flex h-10 items-center px-3 rounded-lg border border-brand-border bg-brand-border/30 text-sm text-brand-muted font-ui select-none">+52</span>
                      <Input id="telefono" placeholder="10 dígitos" maxLength={10} {...register('telefono')} />
                    </div>
                    {errors.telefono && <p className="text-xs text-red-400">{errors.telefono.message}</p>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Select onValueChange={(v) => setValue('estado', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecciona tu estado" /></SelectTrigger>
                    <SelectContent>{ESTADOS_MEXICO.map((est) => <SelectItem key={est} value={est}>{est}</SelectItem>)}</SelectContent>
                  </Select>
                  {errors.estado && <p className="text-xs text-red-400">{errors.estado.message}</p>}
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg border border-brand-border bg-brand-border/20">
                  <input type="checkbox" id="aviso" className="mt-0.5 w-4 h-4 accent-primary cursor-pointer" {...register('aviso_privacidad')} />
                  <label htmlFor="aviso" className="text-xs text-brand-muted font-body cursor-pointer">
                    Acepto el <a href="/aviso-privacidad" target="_blank" className="text-primary hover:underline">Aviso de Privacidad</a> y autorizo el uso de mis datos.
                  </label>
                </div>
                {errors.aviso_privacidad && <p className="text-xs text-red-400">{errors.aviso_privacidad.message}</p>}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setPaso(0)}>← Regresar</Button>
                  <Button type="submit" className="flex-1">Continuar →</Button>
                </div>
              </form>
            )}

            {paso === 2 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-ui font-semibold text-white">Elige tus {paquete.cantidad} número{paquete.cantidad > 1 ? 's' : ''}</h3>
                  <span className="text-primary font-title text-xl">{formatCurrency(paqueteActual.monto)}</span>
                </div>
                <SelectorNumeros
                  sorteoId={sorteo.id}
                  totalNumeros={sorteo.total_numeros}
                  seleccionados={numerosSeleccionados}
                  onSeleccionChange={setNumerosSeleccionados}
                  maxSeleccion={paquete.cantidad}
                />
                <div className="flex gap-3 mt-6">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setPaso(1)} disabled={enviando}>← Regresar</Button>
                  <Button className="flex-1" disabled={numerosSeleccionados.length < paquete.cantidad || enviando} onClick={terminarPedido}>
                    {enviando ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Procesando...</> : '¡Terminar Pedido!'}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
