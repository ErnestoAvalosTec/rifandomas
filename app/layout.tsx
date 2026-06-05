import type { Metadata } from 'next'
import { Bebas_Neue, Poppins, Comfortaa } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
})

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
})

const comfortaa = Comfortaa({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-comfortaa',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Rifando+ | Sorteos y Rifas Virtuales en México',
  description: 'La plataforma más confiable para sorteos y rifas virtuales en México. Premios de alto valor, pagos seguros y resultados transparentes.',
  keywords: 'rifas, sorteos, México, boletos, premios',
  openGraph: {
    title: 'Rifando+ | Sorteos y Rifas Virtuales',
    description: 'Participa en los mejores sorteos de México',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={`${bebasNeue.variable} ${poppins.variable} ${comfortaa.variable} font-body bg-brand-bg text-white antialiased`}>
        {children}
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  )
}
