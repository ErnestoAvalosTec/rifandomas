'use client'

import { useState, useEffect } from 'react'
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
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Copy, Check, Loader2, Minus, Plus } from 'lucide-react'
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
  apellido_materno: z.string().optional(),
  telefono: z.string().length(10, 'Ingresa 10 dígitos sin el código de país'),
  estado: z.string().optional(),
  aviso_privacidad: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar el aviso' }) }),
})

type ClienteForm = z.infer<typeof schemaCliente>

const PASOS = ['Tu pedido', 'Elige números']

const BTN_BASE: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 10, border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
}

const storageKey = (sorteoId: string) => `rf_pedido_${sorteoId}`
const STORAGE_TTL_MS = 6 * 60 * 60 * 1000 // 6 horas

export function FormularioCompra({ open, onClose, sorteo, paqueteInicial }: FormularioCompraProps) {
  const maxCantidad = Math.min(50, sorteo.total_numeros)
  const [paso, setPaso] = useState(0)
  const [cantidad, setCantidadRaw] = useState<number>(paqueteInicial.cantidad || 1)
  const [numerosSeleccionados, setNumerosSeleccionados] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [pedidoExitoso, setPedidoExitoso] = useState(false)
  const [datosCliente, setDatosCliente] = useState<ClienteForm | null>(null)
  const [referenciaPedido, setReferenciaPedido] = useState<string | null>(null)
  const [referenciaCopiada, setReferenciaCopiada] = useState(false)

  const monto = cantidad * sorteo.precio_unitario

  // Evita que el usuario cierre/recargue la pestaña mientras se procesa el pedido
  useEffect(() => {
    if (!enviando) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [enviando])

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<ClienteForm>({
    resolver: zodResolver(schemaCliente),
  })

  const limpiarProgresoGuardado = () => {
    try { localStorage.removeItem(storageKey(sorteo.id)) } catch { /* localStorage no disponible */ }
  }

  // Restaura el progreso si el usuario recargó la página o cerró la pestaña sin querer
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(sorteo.id))
      if (!raw) return
      const saved = JSON.parse(raw)
      if (!saved || Date.now() - saved.ts > STORAGE_TTL_MS) {
        limpiarProgresoGuardado()
        return
      }
      if (saved.cantidad) setCantidadRaw(saved.cantidad)
      if (Array.isArray(saved.numerosSeleccionados)) setNumerosSeleccionados(saved.numerosSeleccionados)
      if (saved.datosCliente) {
        setDatosCliente(saved.datosCliente)
        setPaso(1)
        setValue('nombre', saved.datosCliente.nombre ?? '')
        setValue('apellido_paterno', saved.datosCliente.apellido_paterno ?? '')
        setValue('apellido_materno', saved.datosCliente.apellido_materno ?? '')
        setValue('telefono', saved.datosCliente.telefono ?? '')
        setValue('estado', saved.datosCliente.estado ?? '')
      }
    } catch { /* datos guardados corruptos, se ignoran */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Guarda el progreso mientras el pedido no se haya completado
  useEffect(() => {
    if (pedidoExitoso) return
    const sinProgreso = !datosCliente && numerosSeleccionados.length === 0 && cantidad === (paqueteInicial.cantidad || 1)
    if (sinProgreso) return
    try {
      localStorage.setItem(storageKey(sorteo.id), JSON.stringify({ cantidad, numerosSeleccionados, datosCliente, ts: Date.now() }))
    } catch { /* localStorage no disponible */ }
  }, [cantidad, numerosSeleccionados, datosCliente, pedidoExitoso, paqueteInicial.cantidad, sorteo.id])

  const setCantidad = (n: number) => {
    const v = Math.max(1, Math.min(maxCantidad, isNaN(n) ? 1 : n))
    setCantidadRaw(v)
    if (numerosSeleccionados.length > v) setNumerosSeleccionados(numerosSeleccionados.slice(0, v))
  }

  const handleClose = () => {
    if (enviando) return
    setPaso(0)
    setCantidadRaw(paqueteInicial.cantidad || 1)
    setNumerosSeleccionados([])
    setPedidoExitoso(false)
    setDatosCliente(null)
    setReferenciaPedido(null)
    setReferenciaCopiada(false)
    limpiarProgresoGuardado()
    onClose()
  }

  const copiarReferencia = async () => {
    if (!referenciaPedido) return
    try {
      await navigator.clipboard.writeText(referenciaPedido)
      setReferenciaCopiada(true)
      setTimeout(() => setReferenciaCopiada(false), 2000)
    } catch {
      toast.error('No se pudo copiar la referencia.')
    }
  }

  const terminarPedido = async () => {
    if (!datosCliente) return
    if (numerosSeleccionados.length < cantidad) {
      toast.error(`Selecciona ${cantidad} número${cantidad > 1 ? 's' : ''} para continuar.`)
      return
    }
    setEnviando(true)
    const telefonoConCodigo = `52${datosCliente.telefono}`
    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sorteo_id: sorteo.id,
          usuario_id: sorteo.usuario_id,
          cliente_nombre: datosCliente.nombre,
          cliente_apellidos: [datosCliente.apellido_paterno, datosCliente.apellido_materno].filter(Boolean).join(' '),
          cliente_telefono: telefonoConCodigo,
          cliente_estado: datosCliente.estado || null,
          monto_total: monto,
          numeros: numerosSeleccionados,
        }),
      })

      const json = await res.json()

      if (res.status === 409 && json.error === 'numeros_no_disponibles') {
        // En vez de perder toda la selección, solo se descartan los números
        // que ya no están disponibles (consulta puntual, sin esperar al realtime).
        const supabase = createClient() as any
        const { data } = await supabase
          .from('boletos')
          .select('numero, estatus')
          .eq('sorteo_id', sorteo.id)
          .in('numero', numerosSeleccionados)

        const ocupados = new Set(
          (data ?? []).filter((b: { estatus: string }) => b.estatus !== 'disponible').map((b: { numero: string }) => b.numero)
        )
        const disponibles = numerosSeleccionados.filter((n) => !ocupados.has(n))
        setNumerosSeleccionados(disponibles)

        const perdidos = numerosSeleccionados.length - disponibles.length
        toast.error(
          perdidos > 0
            ? `${perdidos} número${perdidos > 1 ? 's' : ''} ya ${perdidos > 1 ? 'fueron tomados' : 'fue tomado'}. Elige ${perdidos} más para continuar.`
            : 'Uno o más números ya fueron tomados. Por favor selecciona otros.',
          { duration: 6000 }
        )
        return
      }
      if (!res.ok) throw new Error(json.error ?? 'No se pudo crear el pedido.')

      const { pedidoId, referencia, cuenta } = json
      setReferenciaPedido(referencia ?? null)
      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono: telefonoConCodigo,
          nombre: datosCliente.nombre,
          sorteoNombre: sorteo.nombre,
          numeros: numerosSeleccionados,
          fechaSorteo: new Date(sorteo.fecha_sorteo).toLocaleDateString('es-MX'),
          montoTotal: monto,
          banco: cuenta?.banco ?? 'Ver en plataforma',
          clabe: cuenta?.clabe ?? 'Ver en plataforma',
          titular: cuenta?.titular ?? 'Ver en plataforma',
          pedidoId,
          referencia,
        }),
      })
      limpiarProgresoGuardado()
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
    setPaso(1)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {enviando && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 100,
            background: 'rgba(10,10,10,0.88)',
            borderRadius: 16,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 14, padding: 24, textAlign: 'center',
            animation: 'rf-fadein 0.15s ease',
          }}>
            <div style={{
              width: 40, height: 40,
              border: '3px solid rgba(255,255,255,0.15)',
              borderTopColor: '#0C9646',
              borderRadius: '50%',
              animation: 'rf-spin 0.75s linear infinite',
            }} />
            <div>
              <p style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                Procesando tu pedido...
              </p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15 }}>
                No cierres ni recargues esta ventana.
              </p>
            </div>
          </div>
        )}
        {pedidoExitoso ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-brand-green mx-auto mb-4" />
            <h2 className="font-title text-4xl text-white mb-2">¡PEDIDO REGISTRADO!</h2>
            <p className="text-brand-muted font-body mb-2">Revisa tu WhatsApp — te enviamos los datos de pago.</p>
            <p className="text-xs text-brand-muted font-body mb-4">
              Tienes <strong className="text-brand-gold">48 horas</strong> para realizar la transferencia.
            </p>
            {referenciaPedido && (
              <button
                type="button"
                onClick={copiarReferencia}
                className="inline-flex flex-col items-center gap-1 mx-auto mb-6 px-4 py-3 rounded-xl border cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <span className="text-[11px] text-brand-muted font-ui uppercase tracking-wide">
                  Usa esta referencia al transferir
                </span>
                <span className="flex items-center gap-2 font-title text-2xl text-primary tracking-widest">
                  {referenciaPedido}
                  {referenciaCopiada ? <Check className="w-4 h-4 text-brand-green" /> : <Copy className="w-4 h-4 opacity-60" />}
                </span>
                <span className="text-[10px] text-brand-muted font-ui">
                  {referenciaCopiada ? '¡Copiada!' : 'Toca para copiar'}
                </span>
              </button>
            )}
            <Button onClick={handleClose} size="lg" className="w-full">Cerrar</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-title text-3xl tracking-wide">
                PARTICIPAR EN <span className="text-primary">{sorteo.nombre.toUpperCase()}</span>
              </DialogTitle>
            </DialogHeader>

            {/* Progress */}
            <div className="mt-2 mb-6">
              <div className="flex justify-between text-xs font-ui text-brand-muted mb-2">
                {PASOS.map((p, i) => (
                  <span key={p} className={i <= paso ? 'text-white font-semibold' : ''}>{p}</span>
                ))}
              </div>
              <Progress value={((paso + 1) / PASOS.length) * 100} />
            </div>

            {/* ── Paso 0: cantidad + datos personales ── */}
            {paso === 0 && (
              <form onSubmit={handleSubmit(onSubmitCliente)} className="space-y-5">

                {/* Contador de boletos */}
                <div
                  className="space-y-3 p-3 sm:p-4 rounded-xl border"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  <p className="text-xs sm:text-sm font-ui font-semibold text-white">¿Cuántos boletos quieres?</p>

                  <div className="flex items-center justify-center gap-2 sm:gap-4">
                    {/* Botón − */}
                    <button
                      type="button"
                      onClick={() => setCantidad(cantidad - 1)}
                      disabled={cantidad <= 1}
                      className="w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center flex-shrink-0"
                      style={{
                        borderRadius: 8,
                        background: cantidad <= 1 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.09)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: cantidad <= 1 ? 'rgba(255,255,255,0.25)' : '#fff',
                        cursor: cantidad <= 1 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>

                    {/* Input numérico */}
                    <input
                      type="number"
                      value={cantidad}
                      min={1}
                      max={maxCantidad}
                      onChange={e => setCantidad(parseInt(e.target.value))}
                      className="w-14 h-9 sm:w-20 sm:h-13 text-center"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 10, color: '#fff',
                        fontSize: 'clamp(19px, 4vw, 27px)', fontWeight: 800, outline: 'none',
                      }}
                    />

                    {/* Botón + */}
                    <button
                      type="button"
                      onClick={() => setCantidad(cantidad + 1)}
                      disabled={cantidad >= maxCantidad}
                      className="w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center flex-shrink-0"
                      style={{
                        borderRadius: 8,
                        background: cantidad >= maxCantidad ? 'rgba(255,255,255,0.04)' : 'rgba(12, 150, 70,0.15)',
                        border: `1px solid ${cantidad >= maxCantidad ? 'rgba(255,255,255,0.12)' : 'rgba(12, 150, 70,0.4)'}`,
                        color: cantidad >= maxCantidad ? 'rgba(255,255,255,0.25)' : '#0C9646',
                        cursor: cantidad >= maxCantidad ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>

                  <p className="text-center text-xs text-brand-muted font-ui" style={{ fontWeight: 300 }}>
                    <strong style={{ fontWeight: 800, color: '#fff' }}>{cantidad}</strong> boleto{cantidad > 1 ? 's' : ''} × {formatCurrency(sorteo.precio_unitario)} c/u
                  </p>

                  {/* Total */}
                  <div
                    className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 rounded-xl border"
                    style={{ background: 'rgba(12, 150, 70,0.07)', borderColor: 'rgba(12, 150, 70,0.2)' }}
                  >
                    <span className="font-ui text-brand-muted text-xs sm:text-sm" style={{ fontWeight: 300 }}>Total a pagar:</span>
                    <span className="font-title text-xl sm:text-2xl text-primary">{formatCurrency(monto)}</span>
                  </div>
                </div>

                {/* Separador */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
                  <span className="text-xs font-ui" style={{ color: 'rgba(255,255,255,0.35)' }}>Tus datos</span>
                  <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
                </div>

                {/* Datos personales */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="nombre">Nombre(s)</Label>
                      <Input id="nombre" placeholder="Tu nombre" {...register('nombre')} />
                      {errors.nombre && <p className="text-xs text-red-400">{errors.nombre.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="ap_paterno">Ap. Paterno</Label>
                        <Input id="ap_paterno" placeholder="Paterno" {...register('apellido_paterno')} />
                        {errors.apellido_paterno && <p className="text-xs text-red-400">{errors.apellido_paterno.message}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ap_materno">Ap. Materno <span className="text-brand-muted font-normal">(opcional)</span></Label>
                        <Input id="ap_materno" placeholder="Materno" {...register('apellido_materno')} />
                        {errors.apellido_materno && <p className="text-xs text-red-400">{errors.apellido_materno.message}</p>}
                      </div>
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
                    <Label>Estado <span className="text-brand-muted font-normal">(opcional)</span></Label>
                    <Select value={watch('estado') || undefined} onValueChange={(v) => setValue('estado', v)}>
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
                </div>

                <Button type="submit" size="lg" className="w-full">Continuar →</Button>
              </form>
            )}

            {/* ── Paso 1: selector de números ── */}
            {paso === 1 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-ui text-white" style={{ fontWeight: 300 }}>
                    Elige tus <strong style={{ fontWeight: 800 }}>{cantidad}</strong> número{cantidad > 1 ? 's' : ''}
                  </h3>
                  <span className="text-primary font-title text-xl">{formatCurrency(monto)}</span>
                </div>
                <SelectorNumeros
                  sorteoId={sorteo.id}
                  totalNumeros={sorteo.total_numeros}
                  esLoteria={!!(sorteo as any).es_loteria}
                  seleccionados={numerosSeleccionados}
                  onSeleccionChange={setNumerosSeleccionados}
                  maxSeleccion={cantidad}
                />
                <div className="flex gap-3 mt-6">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setPaso(0)} disabled={enviando}>
                    ← Regresar
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={numerosSeleccionados.length < cantidad || enviando}
                    onClick={terminarPedido}
                  >
                    {enviando
                      ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Procesando...</>
                      : '¡Terminar Pedido!'}
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
