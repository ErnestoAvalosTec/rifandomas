'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const PREGUNTAS = [
  {
    pregunta: '¿Cómo sé que el sorteo es legítimo?',
    respuesta: 'Todos los sorteos en Rifando+ son verificados antes de publicarse. Cada organizador debe completar un proceso de validación. Además, los resultados se transmiten en vivo y puedes verificar cualquier boleto en tiempo real.',
  },
  {
    pregunta: '¿Cómo realizo el pago?',
    respuesta: 'Una vez que completes tu pedido, recibirás un mensaje de WhatsApp con los datos de transferencia bancaria (CLABE, banco y titular). Tienes 48 horas para realizar el pago antes de que tus números se liberen.',
  },
  {
    pregunta: '¿Qué pasa si no pago en 48 horas?',
    respuesta: 'Si no se recibe confirmación de pago en 48 horas, tus números se liberan automáticamente y quedan disponibles para otros participantes. Tu pedido se cancela sin penalización.',
  },
  {
    pregunta: '¿Puedo participar desde cualquier estado de México?',
    respuesta: 'Sí, Rifando+ opera a nivel nacional. Puedes participar desde cualquiera de los 32 estados de la república mexicana.',
  },
  {
    pregunta: '¿Cómo me entero si gané?',
    respuesta: 'Te notificamos directamente por WhatsApp al número que registraste. También puedes verificar el estatus de tu boleto en cualquier momento en nuestra sección "Verificador".',
  },
  {
    pregunta: '¿Puedo comprar múltiples boletos?',
    respuesta: 'Sí, puedes adquirir varios paquetes de boletos en el mismo sorteo. Cada pedido puede incluir hasta 10 boletos, pero puedes realizar múltiples pedidos.',
  },
]

function Pregunta({ pregunta, respuesta }: { pregunta: string; respuesta: string }) {
  const [abierta, setAbierta] = useState(false)

  return (
    <div className="border border-brand-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left font-ui font-medium text-white hover:bg-brand-card transition-colors duration-200 cursor-pointer"
        onClick={() => setAbierta(!abierta)}
        aria-expanded={abierta}
      >
        <span>{pregunta}</span>
        <ChevronDown className={cn('w-5 h-5 text-brand-muted flex-shrink-0 transition-transform duration-200', abierta && 'rotate-180')} />
      </button>
      <div className={cn('overflow-hidden transition-all duration-300', abierta ? 'max-h-48' : 'max-h-0')}>
        <p className="px-5 pb-4 text-sm text-brand-muted font-body leading-relaxed">{respuesta}</p>
      </div>
    </div>
  )
}

export function FAQ() {
  return (
    <section className="py-24 bg-brand-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <p className="text-primary text-sm font-ui font-semibold uppercase tracking-widest mb-3">Resolvemos tus dudas</p>
          <h2 className="font-title text-5xl sm:text-6xl text-white tracking-wide">PREGUNTAS FRECUENTES</h2>
        </div>
        <div className="space-y-3">
          {PREGUNTAS.map((p) => (
            <Pregunta key={p.pregunta} {...p} />
          ))}
        </div>
      </div>
    </section>
  )
}
