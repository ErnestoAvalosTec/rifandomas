import { Search, UserPlus, Hash, MessageCircle } from 'lucide-react'

const PASOS = [
  {
    numero: '01',
    icon: Search,
    titulo: 'Selecciona un sorteo',
    descripcion: 'Explora los sorteos activos y elige el que más te guste. Revisa el premio, precio y fecha.',
  },
  {
    numero: '02',
    icon: UserPlus,
    titulo: 'Regístrate',
    descripcion: 'Crea tu cuenta con tu correo y contraseña. Solo toma 30 segundos.',
  },
  {
    numero: '03',
    icon: Hash,
    titulo: 'Elige tu número',
    descripcion: 'Selecciona tus números de la suerte de la cuadrícula disponible en tiempo real.',
  },
  {
    numero: '04',
    icon: MessageCircle,
    titulo: 'Paga por WhatsApp',
    descripcion: 'Recibirás tu resumen de pedido por WhatsApp con los datos de transferencia. ¡48 hrs para pagar!',
  },
]

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="py-24 bg-brand-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-primary text-sm font-ui font-semibold uppercase tracking-widest mb-3">Simple y rápido</p>
          <h2 className="font-title text-5xl sm:text-6xl text-brand-text">
            ¿CÓMO FUNCIONA?
          </h2>
          <p className="text-brand-muted font-body mt-4 max-w-xl mx-auto">
            Participa en cualquier sorteo en menos de 5 minutos desde tu celular.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-brand-border to-transparent" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4">
            {PASOS.map((paso, i) => {
              const Icon = paso.icon
              return (
                <div key={i} className="flex flex-col items-center text-center group">
                  {/* Icon circle */}
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-white border border-brand-border shadow-sm flex items-center justify-center group-hover:border-primary/40 group-hover:shadow-md transition-all duration-300">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary flex items-center justify-center font-title text-sm text-white">
                      {i + 1}
                    </span>
                  </div>

                  <h3 className="font-ui font-semibold text-brand-text text-base mb-2">{paso.titulo}</h3>
                  <p className="text-brand-muted text-sm leading-relaxed max-w-[200px] font-body">{paso.descripcion}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
