import { BadGatewayException } from '@nestjs/common'

export const MAX_SUNAT_RESPONSE = 4 * 1024 * 1024

export class SunatHttpError extends Error {
  constructor(readonly status: number) { super(`SUNAT HTTP ${status}`) }
}

export async function sunatRequest(url: string, request: RequestInit, limit = MAX_SUNAT_RESPONSE) {
  const response = await fetch(url, { ...request, redirect: 'error', signal: AbortSignal.timeout(20_000) })
  const reader = response.body?.getReader()
  if (!reader) return { status: response.status, text: '' }
  const buffers: Uint8Array[] = []
  let length = 0
  try {
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) break
      length += chunk.value.byteLength
      if (length > limit) throw new Error('Respuesta SUNAT demasiado grande')
      buffers.push(chunk.value)
    }
  } finally {
    await reader.cancel().catch(() => undefined)
  }
  return { status: response.status, text: Buffer.concat(buffers).toString('utf8') }
}

export function unavailableSunat(message: string) {
  return new BadGatewayException({ code: 'SUNAT_EXTERNO', message })
}
