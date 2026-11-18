import { ServiceUnavailableException } from '@nestjs/common'

export type SunatEnvironment = 'TEST' | 'PRODUCTION'
export type Issuer = { ruc: string; razonSocial: string; direccion: string; ubigeo?: string; registroMtc?: string }
export type SunatProfile = {
  environment: SunatEnvironment
  issuer: Issuer
  certificateFile: string
  privateKeyFile: string
  privateKeyPassword?: string
}
export type GreProfile = SunatProfile & {
  authBase: string
  apiBase: string
  clientId: string
  clientSecret: string
  solUser: string
  solPassword: string
}

export function requireValue(key: string): string {
  const value = process.env[key]
  if (!value?.trim()) throw new ServiceUnavailableException(`Falta la configuración ${key}`)
  return value
}

export function validRuc(ruc: string): boolean {
  if (!/^(10|15|16|17|20)\d{9}$/.test(ruc)) return false
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const sum = weights.reduce((total, weight, i) => total + Number(ruc[i]) * weight, 0)
  return (11 - sum % 11) % 10 === Number(ruc[10])
}

export function readSunatProfile(kind: 'GRE' | 'CPE'): SunatProfile {
  const prefix = `SUNAT_${kind}`
  const environment = process.env[`${prefix}_ENV`]
  if (environment !== 'TEST' && environment !== 'PRODUCTION') {
    throw new ServiceUnavailableException(`Configure ${prefix}_ENV para usar el flujo tributario`)
  }
  const scope = `${prefix}_${environment}`
  const ruc = requireValue(`${scope}_RUC`)
  if (!validRuc(ruc)) throw new ServiceUnavailableException(`RUC inválido en ${scope}_RUC`)
  return {
    environment,
    issuer: {
      ruc,
      razonSocial: requireValue(`${scope}_RAZON_SOCIAL`).trim(),
      direccion: requireValue(`${scope}_DIRECCION`).trim(),
      ubigeo: process.env[`${scope}_UBIGEO`],
      registroMtc: process.env[`${scope}_REGISTRO_MTC`],
    },
    certificateFile: requireValue(`${scope}_CERT_FILE`),
    privateKeyFile: requireValue(`${scope}_KEY_FILE`),
    privateKeyPassword: process.env[`${scope}_KEY_PASSWORD`],
  }
}

export function greProfile(): GreProfile {
  const profile = readSunatProfile('GRE')
  const scope = `SUNAT_GRE_${profile.environment}`
  let authBase = 'https://api-seguridad.sunat.gob.pe'
  let apiBase = 'https://api-cpe.sunat.gob.pe'
  if (profile.environment === 'TEST') {
    const base = requireValue(`${scope}_BASE_URL`)
    if (!/^http:\/\/127\.0\.0\.1:[1-9]\d{1,4}$/.test(base)) throw new ServiceUnavailableException('El entorno GRE de pruebas requiere un servidor local')
    authBase = apiBase = base
  }
  return {
    ...profile,
    authBase,
    apiBase,
    clientId: requireValue(`${scope}_CLIENT_ID`),
    clientSecret: requireValue(`${scope}_CLIENT_SECRET`),
    solUser: requireValue(`${scope}_SOL_USER`),
    solPassword: requireValue(`${scope}_SOL_PASSWORD`),
  }
}

export function assertTransmissionEnabled(kind: 'GRE' | 'CPE', profile: SunatProfile) {
  if (profile.environment === 'PRODUCTION' && process.env[`SUNAT_${kind}_PRODUCTION_ENABLED`] !== 'true') {
    throw new ServiceUnavailableException(`El envío de ${kind} a producción requiere habilitación explícita`)
  }
}
