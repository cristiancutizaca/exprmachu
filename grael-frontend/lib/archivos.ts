export async function abrirArchivo(load: () => Promise<{ data: Blob }>, filename: string, imprimir = false) {
  const viewer = imprimir ? window.open('', '_blank') : null
  if (imprimir && !viewer) throw new Error('Habilite ventanas emergentes para abrir el PDF')
  if (viewer) viewer.opener = null
  try {
    const { data } = await load()
    const url = URL.createObjectURL(data)
    if (viewer) {
      viewer.location.replace(url)
      window.setTimeout(() => URL.revokeObjectURL(url), 300_000)
      return
    }
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename.replace(/[^a-zA-Z0-9._-]/g, '-')
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  } catch (error) {
    viewer?.close()
    throw error
  }
}

export function mensajeApi(error: unknown, fallback: string) {
  const response = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data
  return Array.isArray(response?.message) ? response.message.join(' · ') : response?.message
    || (error instanceof Error && !('response' in error) ? error.message : fallback)
}

export function solicitudUuid() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
}
