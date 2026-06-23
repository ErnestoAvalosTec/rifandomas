import type { Metadata } from 'next'
import { Montserrat, Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { WhatsAppFloat } from '@/components/public/WhatsAppFloat'
import { CookieConsent } from '@/components/public/CookieConsent'

const montserrat = Montserrat({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
})

const inter = Inter({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://rifandomas.com.mx'),
  title: 'RifandoMas | Sorteos y Rifas Virtuales en México',
  description: 'La plataforma más confiable para sorteos y rifas virtuales en México. Premios de alto valor, pagos seguros y resultados transparentes.',
  keywords: 'rifas, sorteos, México, boletos, premios, RifandoMas',
  icons: {
    icon: '/api/favicon',
    shortcut: '/api/favicon',
  },
  openGraph: {
    title: 'RifandoMas | Sorteos y Rifas Virtuales',
    description: 'Participa en los mejores sorteos de México',
    type: 'website',
    url: 'https://rifandomas.com.mx',
    siteName: 'RifandoMas',
    locale: 'es_MX',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${montserrat.variable} ${inter.variable} font-body bg-brand-bg text-brand-text antialiased`}>
        {children}
        <WhatsAppFloat />
        <CookieConsent />
        <Toaster theme="light" position="top-right" richColors />
      </body>
    </html>
  )
}
