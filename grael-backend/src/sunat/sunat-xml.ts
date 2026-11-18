import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { createPrivateKey, X509Certificate } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { DOMParser } from '@xmldom/xmldom'
import { create } from 'xmlbuilder2'
import { SignedXml } from 'xml-crypto'
import { validateXML } from 'xmllint-wasm'
import { Issuer, SunatProfile } from './sunat-config'

export const DS = 'http://www.w3.org/2000/09/xmldsig#'
const ubl = 'urn:oasis:names:specification:ubl:schema:xsd:'
export const CBC = `${ubl}CommonBasicComponents-2`
export const CAC = `${ubl}CommonAggregateComponents-2`
export const EXT = `${ubl}CommonExtensionComponents-2`
const SIGNATURE_ID = 'FirmaSUNAT'
const C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'

export function ublRoot(name: 'DespatchAdvice' | 'Invoice') {
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele(`${ubl}${name}-2`, name)
    .att('xmlns:cac', CAC)
    .att('xmlns:cbc', CBC)
    .att('xmlns:ext', EXT)
  root.ele('ext:UBLExtensions').ele('ext:UBLExtension').ele('ext:ExtensionContent')
  return root
}

export type UblNode = ReturnType<typeof ublRoot>

export function textNode(parent: UblNode, name: string, value: string | number, attributes?: Record<string, string>) {
  const node = parent.ele(`cbc:${name}`)
  if (attributes) node.att(attributes)
  node.txt(String(value))
  return node
}

export function ublSignature(root: UblNode, issuer: Issuer) {
  const signature = root.ele('cac:Signature')
  textNode(signature, 'ID', SIGNATURE_ID)
  const party = signature.ele('cac:SignatoryParty')
  textNode(party.ele('cac:PartyIdentification'), 'ID', issuer.ruc)
  textNode(party.ele('cac:PartyName'), 'Name', issuer.razonSocial)
  textNode(signature.ele('cac:DigitalSignatureAttachment').ele('cac:ExternalReference'), 'URI', `#${SIGNATURE_ID}`)
}

export function parseXml(xml: string) {
  if (/<!\s*(DOCTYPE|ENTITY)\b/i.test(xml)) throw new Error('DTD no permitido')
  return new DOMParser({ onError: (_level, message) => { throw new Error(message) } }).parseFromString(xml, 'application/xml')
}

export async function signUbl(xml: string, profile: SunatProfile): Promise<string> {
  try {
    const [certificatePem, keyPem] = await Promise.all([
      readFile(profile.certificateFile, 'utf8'),
      readFile(profile.privateKeyFile, 'utf8'),
    ])
    const certificate = new X509Certificate(certificatePem)
    const privateKey = createPrivateKey({ key: keyPem, passphrase: profile.privateKeyPassword })
    const now = Date.now()
    if (certificate.publicKey.asymmetricKeyType !== 'rsa' || !certificate.checkPrivateKey(privateKey)
      || now < Date.parse(certificate.validFrom) || now > Date.parse(certificate.validTo)) {
      throw new Error('Certificado o clave inválidos')
    }
    const signature = new SignedXml({
      privateKey,
      publicCert: certificate.toString(),
      canonicalizationAlgorithm: C14N,
      signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
      getKeyInfoContent: SignedXml.getKeyInfoContent,
    })
    signature.addReference({
      xpath: '/*',
      digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
      transforms: [`${DS}enveloped-signature`, C14N],
      isEmptyUri: true,
    })
    signature.computeSignature(xml, {
      prefix: 'ds',
      attrs: { Id: SIGNATURE_ID },
      location: { reference: `//*[local-name(.)='ExtensionContent' and namespace-uri(.)='${EXT}']`, action: 'append' },
    })
    return signature.getSignedXml()
  } catch {
    throw new ServiceUnavailableException('No se pudo firmar con el certificado digital configurado')
  }
}

const flattenImports = (schema: string) => schema.replace(/schemaLocation="([^"]+)"/g, (_match, path) => {
  if (/^[a-z]+:/i.test(path)) throw new Error('El esquema requiere una referencia remota')
  return `schemaLocation="${basename(path)}"`
})

@Injectable()
export class SunatSchema {
  private cache = new Map<string, Promise<{ schema: string; preload: { fileName: string; contents: string }[] }>>()

  private load(directory: string, name: 'DespatchAdvice' | 'Invoice') {
    const key = join(directory, name)
    if (!this.cache.has(key)) {
      const loading = (async () => {
        const common = join(directory, 'common')
        const names = (await readdir(common)).filter(file => file.endsWith('.xsd'))
        const [schema, preload] = await Promise.all([
          readFile(join(directory, 'maindoc', `UBL-${name}-2.1.xsd`), 'utf8').then(flattenImports),
          Promise.all(names.map(async fileName => ({ fileName, contents: flattenImports(await readFile(join(common, fileName), 'utf8')) }))),
        ])
        return { schema, preload }
      })()
      this.cache.set(key, loading)
      loading.catch(() => this.cache.delete(key))
    }
    return this.cache.get(key)
  }

  async assertValid(xml: string, name: 'DespatchAdvice' | 'Invoice') {
    const directory = process.env.SUNAT_XSD_DIR
    if (!directory) throw new ServiceUnavailableException('Configure SUNAT_XSD_DIR con los esquemas oficiales UBL 2.1')
    let result: Awaited<ReturnType<typeof validateXML>>
    try {
      const { schema, preload } = await this.load(directory, name)
      result = await validateXML({ xml: [xml], schema: [schema], preload, maxMemoryPages: 1024 })
    } catch {
      throw new ServiceUnavailableException('No se pudo cargar o ejecutar el esquema oficial UBL 2.1')
    }
    if (!result.valid) throw new BadRequestException({
      code: 'SUNAT_XSD_INVALID',
      message: 'El XML incumple el esquema oficial UBL 2.1',
      details: result.errors.slice(0, 5).map(error => error.message),
    })
  }
}
