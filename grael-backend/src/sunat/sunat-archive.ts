import { createHash } from 'node:crypto'
import { zipSync, strToU8 } from 'fflate'
import { fromBuffer } from 'yauzl'
import { CAC, CBC, parseXml } from './sunat-xml'

const MAX_CDR_BYTES = 2 * 1024 * 1024
const RESPONSE_NS = 'urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2'
const MAX_XML_BYTES = 4 * 1024 * 1024

export function hashBytes(data: string | Buffer) {
  return createHash('sha256').update(data).digest('hex')
}

export function ublZip(baseName: string, xml: string): Buffer {
  return Buffer.from(zipSync({ [`${baseName}.xml`]: strToU8(xml) }, { mtime: new Date('2000-01-01T12:00:00Z') }))
}

export function decodeCdr(value: unknown): Buffer {
  if (typeof value !== 'string' || value.length > Math.ceil(MAX_CDR_BYTES / 3) * 4
    || value.length % 4 || !/^[A-Za-z0-9+/]+=*$/.test(value)) throw new Error('CDR base64 inválido')
  const archive = Buffer.from(value, 'base64')
  if (archive.toString('base64') !== value) throw new Error('CDR base64 inválido')
  return archive
}

function readCdrXml(archive: Buffer, baseName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!archive.length || archive.length > MAX_CDR_BYTES) return reject(new Error('Tamaño de CDR inválido'))
    fromBuffer(archive, { lazyEntries: true, validateEntrySizes: true, strictFileNames: true }, (error, zip) => {
      if (error || !zip) return reject(error || new Error('CDR ZIP inválido'))
      zip.on('error', reject)
      if (zip.entryCount !== 1) {
        zip.close()
        return reject(new Error('Se esperaba un XML dentro del CDR'))
      }
      zip.once('entry', entry => {
        if (entry.fileName.toUpperCase() !== `R-${baseName}.xml`.toUpperCase() || entry.uncompressedSize > MAX_XML_BYTES) {
          zip.close()
          return reject(new Error('El archivo CDR no corresponde al documento'))
        }
        zip.openReadStream(entry, (readError, stream) => {
          if (readError || !stream) {
            zip.close()
            return reject(readError || new Error('XML del CDR ilegible'))
          }
          const chunks: Buffer[] = []
          stream.on('data', chunk => chunks.push(chunk))
          stream.once('error', error => { zip.close(); reject(error) })
          stream.once('end', () => { zip.close(); resolve(Buffer.concat(chunks).toString('utf8')) })
        })
      })
      zip.readEntry()
    })
  })
}

export async function parseCdr(archive: Buffer, baseName: string, documentNumber: string) {
  const xml = parseXml(await readCdrXml(archive, baseName))
  const root = xml.documentElement
  if (!root || root.localName !== 'ApplicationResponse' || root.namespaceURI !== RESPONSE_NS) {
    throw new Error('CDR sin ApplicationResponse UBL')
  }
  const responses = root.getElementsByTagNameNS(CAC, 'DocumentResponse')
  if (responses.length !== 1) throw new Error('Se esperaba un resultado por documento')
  const result = responses.item(0)
  const response = result?.getElementsByTagNameNS(CAC, 'Response').item(0)
  const reference = result?.getElementsByTagNameNS(CAC, 'DocumentReference').item(0)
  const id = reference?.getElementsByTagNameNS(CBC, 'ID').item(0)?.textContent?.trim()
    || response?.getElementsByTagNameNS(CBC, 'ReferenceID').item(0)?.textContent?.trim()
  const normalizeNumber = (value: string) => value.replace(/-0+(?=\d)/, '-')
  if (!id || normalizeNumber(id) !== normalizeNumber(documentNumber)) throw new Error('El correlativo del CDR no coincide')
  const codigo = response?.getElementsByTagNameNS(CBC, 'ResponseCode').item(0)?.textContent?.trim()
  if (!codigo || !/^\d{1,8}$/.test(codigo)) throw new Error('Código de respuesta CDR inválido')
  const mensaje = response.getElementsByTagNameNS(CBC, 'Description').item(0)?.textContent?.trim().slice(0, 500)
  const notes = root.getElementsByTagNameNS(CBC, 'Note')
  const observaciones = Array.from({ length: Math.min(notes.length, 50) }, (_, i) => notes.item(i)?.textContent?.trim().slice(0, 500) || '').filter(Boolean)
  return { codigo, mensaje, observaciones }
}
