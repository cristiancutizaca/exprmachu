import { ServiceUnavailableException } from '@nestjs/common'
import { create } from 'xmlbuilder2'
import { decodeCdr } from '../sunat/sunat-archive'
import { readSunatProfile, requireValue } from '../sunat/sunat-config'
import { sunatRequest } from '../sunat/sunat-http'
import { parseXml } from '../sunat/sunat-xml'
import { CpeType } from './cpe.dto'

const SOAP = 'http://schemas.xmlsoap.org/soap/envelope/'
const WSSE = 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd'
const SUNAT = 'http://service.sunat.gob.pe'

export function cpeProfile() {
  const profile = readSunatProfile('CPE')
  const prefix = `SUNAT_CPE_${profile.environment}`
  const testBase = process.env.SUNAT_CPE_TEST_BASE_URL
  if (profile.environment === 'PRODUCTION' && process.env.SUNAT_CPE_PRODUCTION_REGIMEN !== 'SEE_CONTRIBUYENTE') {
    throw new ServiceUnavailableException('Confirme que el RUC puede emitir CPE por SEE del Contribuyente')
  }
  if (profile.environment === 'TEST' && testBase && !/^http:\/\/127\.0\.0\.1:[1-9]\d{1,4}$/.test(testBase)) {
    throw new ServiceUnavailableException('La URL alternativa CPE de pruebas debe ser local')
  }
  return {
    ...profile,
    envelopeUser: profile.issuer.ruc + requireValue(`${prefix}_SOL_USER`),
    envelopePassword: requireValue(`${prefix}_SOL_PASSWORD`),
    endpoint: profile.environment === 'PRODUCTION' ? 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService'
      : testBase || 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
    consultEndpoint: profile.environment === 'PRODUCTION'
      ? 'https://e-factura.sunat.gob.pe/ol-it-wsconscpegem/billConsultService' : testBase,
  }
}

type Profile = ReturnType<typeof cpeProfile>

async function soap(profile: Profile, endpoint: string, action: 'sendBill' | 'getStatusCdr', fields: Record<string, string>) {
  const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('soapenv:Envelope')
    .att('xmlns:soapenv', SOAP).att('xmlns:wsse', WSSE).att('xmlns:ser', SUNAT)
  const token = root.ele('soapenv:Header').ele('wsse:Security').ele('wsse:UsernameToken')
  token.ele('wsse:Username').txt(profile.envelopeUser)
  token.ele('wsse:Password').txt(profile.envelopePassword)
  const body = root.ele('soapenv:Body').ele(`ser:${action}`)
  for (const [name, value] of Object.entries(fields)) body.ele(name).txt(value)
  const response = await sunatRequest(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'text/xml; charset=utf-8', SOAPAction: '""' },
    body: root.end(),
  })
  if (response.status !== 200) throw new Error('Respuesta SOAP sin CDR')
  const xml = parseXml(response.text)
  const envelope = xml.documentElement
  const responseBody = envelope?.getElementsByTagNameNS(SOAP, 'Body').item(0)
  const node = responseBody?.getElementsByTagNameNS(SUNAT, `${action}Response`).item(0)
  if (!node) throw new Error('El servicio no devolvió la operación esperada')
  return node
}

export async function sendCpe(profile: Profile, name: string, zip: Buffer) {
  const response = await soap(profile, profile.endpoint, 'sendBill', { fileName: `${name}.zip`, contentFile: zip.toString('base64') })
  return decodeCdr(response.getElementsByTagNameNS('*', 'applicationResponse').item(0)?.textContent?.trim())
}

export async function consultCpe(profile: Profile, type: CpeType, series: string, number: string) {
  if (!profile.consultEndpoint) throw new ServiceUnavailableException('La recuperación de CDR CPE de pruebas requiere un servidor local')
  const response = await soap(profile, profile.consultEndpoint, 'getStatusCdr', {
    rucComprobante: profile.issuer.ruc, tipoComprobante: type, serieComprobante: series, numeroComprobante: number,
  })
  return decodeCdr(response.getElementsByTagNameNS('*', 'content').item(0)?.textContent?.trim())
}
