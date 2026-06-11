import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function padNumero(num: number, digits: number = 4): string {
  return String(num).padStart(digits, '0')
}

export const ESTADOS_MEXICO = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima',
  'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo',
  'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca',
  'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa',
  'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán',
  'Zacatecas',
]

export const CATEGORIAS = [
  'Vehículos',
  'Motocicletas',
  'Electrónica',
  'Efectivo',
  'Electrodomésticos',
  'Viajes',
  'Joyería',
  'Deportes',
  'Inmuebles',
  'Otro',
]

const REF_CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ' // sin 0/O, 1/I/L para evitar ambigüedad

function quitarAcentos(str: string): string {
  const inicio = String.fromCharCode(0x0300)
  const fin = String.fromCharCode(0x036f)
  return str.normalize('NFD').replace(new RegExp(`[${inicio}-${fin}]`, 'g'), '')
}

const STOPWORDS_REFERENCIA = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'con', 'para', 'a', 'un', 'una',
])

function abreviarSorteo(nombre: string): string {
  const limpio = quitarAcentos(nombre).toUpperCase().replace(/[^A-Z0-9\s]/g, ' ')
  const palabras = limpio.split(/\s+/).filter(Boolean)
  const significativas = palabras.filter((p) => !STOPWORDS_REFERENCIA.has(p.toLowerCase()) && /[A-Z]/.test(p))

  if (significativas.length === 0) {
    return 'RIF'
  }

  if (significativas.length === 1) {
    return significativas[0].replace(/[^A-Z]/g, '').padEnd(3, 'X').slice(0, 3)
  }

  const siglas = significativas
    .map((p) => p.match(/[A-Z]/)?.[0] ?? '')
    .filter(Boolean)
    .join('')
    .slice(0, 3)

  return siglas.padEnd(3, 'X')
}

function sufijoAleatorio(length = 4): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += REF_CHARSET[Math.floor(Math.random() * REF_CHARSET.length)]
  }
  return out
}

/**
 * Genera una referencia corta para usar como concepto de transferencia.
 * Formato: ABC-XXXX. No garantiza unicidad por sí sola — el caller debe
 * reintentar ante colisión (constraint unique en pedidos.referencia).
 */
export function generarReferenciaPedido(sorteoNombre: string): string {
  const prefijo = abreviarSorteo(sorteoNombre)
  return `${prefijo}-${sufijoAleatorio(4)}`
}
