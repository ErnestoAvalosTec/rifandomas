export function anuncioGanador(esLoteria: boolean) {
  return esLoteria
    ? 'El ganador se determinará con base en los últimos dígitos del sorteo de la Lotería Nacional — un resultado público y verificable por cualquier persona.'
    : 'El ganador será anunciado a través de las redes sociales oficiales del organizador de este sorteo.'
}

export function esNuevoUsuario(createdAt: string): boolean {
  const dias = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  return dias < 30
}

export function antiguedadEnPlataforma(createdAt: string): string {
  const inicio = new Date(createdAt).getTime()
  const dias = Math.floor((Date.now() - inicio) / (1000 * 60 * 60 * 24))

  if (dias < 30) return dias <= 1 ? 'Se unió hoy' : `${dias} días en la plataforma`

  const meses = Math.floor(dias / 30)
  if (meses < 12) return `${meses} ${meses === 1 ? 'mes' : 'meses'} en la plataforma`

  const anios = Math.floor(meses / 12)
  const mesesRestantes = meses % 12
  if (mesesRestantes === 0) return `${anios} ${anios === 1 ? 'año' : 'años'} en la plataforma`
  return `${anios} ${anios === 1 ? 'año' : 'años'} y ${mesesRestantes} ${mesesRestantes === 1 ? 'mes' : 'meses'} en la plataforma`
}
