import { Injectable } from '@nestjs/common'
import { hashBytes } from '../sunat/sunat-archive'
import { GreProfile } from '../sunat/sunat-config'
import { SunatHttpError, sunatRequest, unavailableSunat } from '../sunat/sunat-http'

const TICKET = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
const scope = 'https://api-cpe.sunat.gob.pe'

@Injectable()
export class GreSunatClient {
  private tokenCache?: { key: string; token: string; expiresAt: number }
  private inFlight?: { key: string; result: Promise<string> }

  async token(profile: GreProfile): Promise<string> {
    const key = hashBytes(JSON.stringify([profile.authBase, profile.issuer.ruc, profile.clientId, profile.clientSecret, profile.solUser, profile.solPassword]))
    if (this.tokenCache?.key === key && this.tokenCache.expiresAt > Date.now()) return this.tokenCache.token
    if (this.inFlight?.key === key) return this.inFlight.result
    const result = this.obtainToken(profile, key)
    this.inFlight = { key, result }
    try {
      return await result
    } finally {
      if (this.inFlight?.result === result) this.inFlight = undefined
    }
  }

  private async obtainToken(profile: GreProfile, key: string) {
    try {
      const body = new URLSearchParams({
        grant_type: 'password',
        scope,
        client_id: profile.clientId,
        client_secret: profile.clientSecret,
        username: profile.issuer.ruc + profile.solUser,
        password: profile.solPassword,
      })
      const response = await sunatRequest(`${profile.authBase}/v1/clientessol/${encodeURIComponent(profile.clientId)}/oauth2/token/`, {
        method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' },
      }, 64 * 1024)
      if (response.status !== 200) throw new SunatHttpError(response.status)
      const { access_token: token, expires_in: expires } = JSON.parse(response.text)
      if (typeof token !== 'string' || !token || token.length > 16_384 || !Number.isFinite(Number(expires)) || Number(expires) <= 0) {
        throw new Error('Token GRE inválido')
      }
      this.tokenCache = { key, token, expiresAt: Date.now() + Math.max(0, Math.min(Number(expires), 3600) - 30) * 1000 }
      return token
    } catch {
      throw unavailableSunat('SUNAT GRE no entregó un token válido. Revise la configuración de API y Usuario SOL.')
    }
  }

  async send(profile: GreProfile, token: string, name: string, zip: Buffer) {
    const data = { archivo: { nomArchivo: `${name}.zip`, arcGreZip: zip.toString('base64'), hashZip: hashBytes(zip) } }
    const response = await sunatRequest(`${profile.apiBase}/v1/contribuyente/gem/comprobantes/${name}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(data),
    }, 64 * 1024)
    if (response.status !== 200) {
      if (response.status === 401 || response.status === 403) this.tokenCache = undefined
      throw new SunatHttpError(response.status)
    }
    const { numTicket } = JSON.parse(response.text)
    if (typeof numTicket !== 'string' || !TICKET.test(numTicket)) throw new Error('Respuesta sin ticket GRE válido')
    return numTicket.toLowerCase()
  }

  async status(profile: GreProfile, ticket: string) {
    if (!TICKET.test(ticket)) throw new Error('Ticket GRE inválido')
    const token = await this.token(profile)
    const response = await sunatRequest(`${profile.apiBase}/v1/contribuyente/gem/comprobantes/envios/${ticket}`, {
      headers: { authorization: `Bearer ${token}` },
    })
    if (response.status !== 200) {
      if (response.status === 401 || response.status === 403) this.tokenCache = undefined
      throw new SunatHttpError(response.status)
    }
    const body = JSON.parse(response.text)
    return {
      code: String(body.codRespuesta || ''),
      generated: String(body.indCdrGenerado ?? ''),
      cdr: body.arcCdr,
      errorCode: String(body.error?.numError ?? ''),
      errorMessage: typeof body.error?.desError === 'string' ? body.error.desError.slice(0, 500) : undefined,
    }
  }
}
