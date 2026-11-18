import { BadRequestException } from '@nestjs/common'
import { hoyPeru, limitesDiaPeru } from '../common/peru-time'
import { Issuer, validRuc } from '../sunat/sunat-config'
import { textNode as cbc, UblNode, ublRoot, ublSignature } from '../sunat/sunat-xml'
import { GreAddressDto, GreDraftDataDto, GrePartyDto, GreType } from './gre-fiscal.dto'

export type GreSnapshot = {
  traslado: GreDraftDataDto
  issuer: Issuer
  remitente: GrePartyDto
  destinatario: GrePartyDto
}

const catalog = (code: string) => `urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo${code}`
const codeAttrs = (listName: string, code: string) => ({ listName, listAgencyName: 'PE:SUNAT', listURI: catalog(code) })
const idAttrs = (schemeID: string) => ({ schemeID, schemeName: 'Documento de Identidad', schemeAgencyName: 'PE:SUNAT', schemeURI: catalog('06') })
const domesticReasons = new Set(['01', '02', '03', '04', '05', '06', '07', '13', '14', '17'])
const documentNames = { '01': 'Factura', '03': 'Boleta de venta', '04': 'Liquidación de compra', '09': 'Guía de remisión remitente', '12': 'Ticket de máquina registradora', '31': 'Guía de remisión transportista', '48': 'Comprobante de operaciones' }
const referenceFormats: Record<string, RegExp> = {
  '01': /^(F[A-Z0-9]{3}|E001|\d{1,4})-\d{1,8}$/,
  '03': /^(B[A-Z0-9]{3}|EB01|\d{1,4})-\d{1,8}$/,
  '04': /^(L[A-Z0-9]{3}|E001|\d{1,4})-\d{1,8}$/,
  '09': /^(T[A-Z0-9]{3}|EG02|EG07|\d{1,4})-\d{1,8}$/,
  '31': /^(V[A-Z0-9]{3}|EG03|EG04)-\d{1,8}$/,
  '48': /^\d{1,4}-\d{1,7}$/,
}

export function assertGreSeries(type: GreType, series: string) {
  if (!(type === '09' ? /^T[A-Z0-9]{3}$/ : /^V[A-Z0-9]{3}$/).test(series)) {
    throw new BadRequestException('Use serie T para remitente y serie V para transportista, con cuatro caracteres')
  }
}

function assertParty(party: GrePartyDto, label: string, rucOnly = false) {
  const valid = party && (party.tipoDocumento === '6' ? validRuc(party.documento) : !rucOnly && /^\d{8}$/.test(party.documento))
  if (!valid || !party.razonSocial?.trim()) throw new BadRequestException(`Revise el documento y nombre de ${label}`)
}

export function validateGre(type: GreType, snapshot: GreSnapshot, now = new Date()) {
  const { issuer, remitente, destinatario, traslado: t } = snapshot
  const transportista = type === '31'
  assertGreSeries(type, t.serie)
  limitesDiaPeru(t.fechaTraslado)
  if (t.fechaTraslado < hoyPeru(now)) throw new BadRequestException('La fecha del traslado precede a la fecha de emisión en Perú')
  assertParty(remitente, 'remitente')
  assertParty(destinatario, 'destinatario')
  if (Number(t.pesoBruto) <= 0) throw new BadRequestException('El peso bruto debe ser positivo')
  for (const point of [t.partida, t.llegada]) {
    if (point.ubigeo === '000000' || !point.direccion.trim()) throw new BadRequestException('Indique ubigeos y direcciones de partida y llegada')
    if (Boolean(point.codigoLocal) !== Boolean(point.rucLocal) || (point.rucLocal && !validRuc(point.rucLocal))) {
      throw new BadRequestException('El código de establecimiento requiere su RUC válido')
    }
    if (transportista && point.codigoLocal) throw new BadRequestException('Para GRE transportista registre la dirección completa')
  }

  const references = t.referencias ?? []
  const uniqueRefs = new Set<string>()
  for (const ref of references) {
    const key = `${ref.tipo}:${ref.numero}`
    const pattern = referenceFormats[ref.tipo]
    if (!validRuc(ref.rucEmisor) || uniqueRefs.has(key) || (pattern && (!pattern.test(ref.numero) || Number(ref.numero.split('-').at(-1)) === 0))) {
      throw new BadRequestException('Revise el formato, RUC y duplicados de documentos relacionados')
    }
    uniqueRefs.add(key)
  }

  const greRemitenteElectronica = transportista && references.some(ref => ref.tipo === '09' && !/^\d/.test(ref.numero))
  const guiaFisica = transportista && references.some(ref => ref.tipo === '09' && /^\d/.test(ref.numero))
  if (greRemitenteElectronica) {
    if (guiaFisica || references.some(ref => ref.tipo === '09' && ref.rucEmisor !== remitente.documento)) {
      throw new BadRequestException('La guía remitente electrónica debe corresponder al RUC del remitente del traslado')
    }
    if (t.bienes?.length) throw new BadRequestException('SUNAT toma el detalle de bienes de la guía remitente electrónica referenciada')
  } else if (!t.bienes?.length || t.bienes.some(item => Number(item.cantidad) <= 0 || !item.descripcion.trim())) {
    throw new BadRequestException('Indique el detalle de bienes y cantidades positivas')
  }

  if (transportista) {
    if (!t.pagador) throw new BadRequestException('Indique quién paga el flete')
    if (t.pagador === 'Tercero') assertParty(t.terceroPagador, 'tercero pagador')
    if (t.pagador === 'Subcontratador' || t.subcontratador) assertParty(t.subcontratador, 'subcontratador', true)
    if (t.motivo || t.modalidad || t.transportista || t.bultos || (t.terceroPagador && t.pagador !== 'Tercero')) {
      throw new BadRequestException('Revise los campos aplicables a GRE transportista')
    }
  } else {
    if (remitente.documento !== issuer.ruc) throw new BadRequestException('La GRE remitente se emite únicamente con el RUC del remitente configurado')
    if (!t.modalidad || !domesticReasons.has(t.motivo)) throw new BadRequestException('Seleccione modalidad y motivo de traslado nacional habilitado')
    if (t.modalidad === '01') assertParty(t.transportista, 'transportista', true)
    if (t.pagador || t.terceroPagador || t.subcontratador || t.modalidad === '02' && t.transportista) {
      throw new BadRequestException('Revise los campos aplicables a GRE remitente')
    }
  }

  const fleetRequired = transportista || t.modalidad === '02'
  if (fleetRequired && (!t.vehiculo || !t.conductores?.length || transportista && !t.vehiculo.tuc)) {
    throw new BadRequestException('Indique el vehículo y conductor principal y, para transportista, su TUC o certificado de habilitación')
  }
  if (!fleetRequired && (t.vehiculo || t.conductores?.length || t.remolques?.length)) throw new BadRequestException('El traslado público usa los datos del transportista')
  const plates = [t.vehiculo, ...(t.remolques || [])].filter(Boolean).map(vehicle => vehicle.placa)
  if (plates.some(plate => /^0+$/.test(plate)) || new Set(plates).size !== plates.length) throw new BadRequestException('Revise las placas de los vehículos')
  const licenses = (t.conductores ?? []).map(driver => driver.licencia)
  if (new Set(licenses).size !== licenses.length || new Set((t.conductores ?? []).map(driver => driver.dni)).size !== licenses.length) {
    throw new BadRequestException('No se pueden repetir conductores')
  }
  if (guiaFisica && t.bienes?.length === 0) throw new BadRequestException('Consigne los bienes de la guía física')
}

function party(parent: UblNode, data: GrePartyDto) {
  cbc(parent.ele('cac:PartyIdentification'), 'ID', data.documento, idAttrs(data.tipoDocumento))
  cbc(parent.ele('cac:PartyLegalEntity'), 'RegistrationName', data.razonSocial.trim())
}

function address(parent: UblNode, point: GreAddressDto) {
  cbc(parent, 'ID', point.ubigeo, { schemeName: 'Ubigeos', schemeAgencyName: 'PE:INEI' })
  if (point.codigoLocal) cbc(parent, 'AddressTypeCode', point.codigoLocal, { listID: point.rucLocal })
  cbc(parent.ele('cac:AddressLine'), 'Line', point.direccion.trim())
}

export function buildGreXml(type: GreType, snapshot: GreSnapshot, number: string, now = new Date()) {
  validateGre(type, snapshot, now)
  const { issuer, remitente, destinatario, traslado: t } = snapshot
  const carrier = type === '31'
  const root = ublRoot('DespatchAdvice')
  cbc(root, 'UBLVersionID', '2.1')
  cbc(root, 'CustomizationID', '2.0')
  cbc(root, 'ID', `${t.serie}-${number}`)
  cbc(root, 'IssueDate', hoyPeru(now))
  cbc(root, 'IssueTime', new Date(now.getTime() - 5 * 3600000).toISOString().slice(11, 19))
  cbc(root, 'DespatchAdviceTypeCode', type, codeAttrs('Tipo de Documento', '01'))
  if (t.observacion?.trim()) cbc(root, 'Note', t.observacion.trim())
  for (const ref of t.referencias ?? []) {
    const reference = root.ele('cac:AdditionalDocumentReference')
    cbc(reference, 'ID', ref.numero)
    cbc(reference, 'DocumentTypeCode', ref.tipo, codeAttrs('Documento relacionado al transporte', '61'))
    cbc(reference, 'DocumentType', documentNames[ref.tipo])
    cbc(reference.ele('cac:IssuerParty').ele('cac:PartyIdentification'), 'ID', ref.rucEmisor, idAttrs('6'))
  }
  ublSignature(root, issuer)
  party(root.ele('cac:DespatchSupplierParty').ele('cac:Party'), { tipoDocumento: '6', documento: issuer.ruc, razonSocial: issuer.razonSocial })
  party(root.ele('cac:DeliveryCustomerParty').ele('cac:Party'), destinatario)
  if (carrier && t.pagador === 'Tercero') party(root.ele('cac:OriginatorCustomerParty').ele('cac:Party'), t.terceroPagador)

  const shipment = root.ele('cac:Shipment')
  cbc(shipment, 'ID', 'SUNAT_Envio')
  if (!carrier) cbc(shipment, 'HandlingCode', t.motivo, codeAttrs('Motivo de traslado', '20'))
  cbc(shipment, 'GrossWeightMeasure', t.pesoBruto, { unitCode: t.unidadPeso })
  if (t.bultos) cbc(shipment, 'TotalTransportHandlingUnitQuantity', t.bultos)
  if (carrier) {
    if (t.subcontratador) cbc(shipment, 'SpecialInstructions', 'SUNAT_Envio_IndicadorTrasporteSubcontratado')
    cbc(shipment, 'SpecialInstructions', `SUNAT_Envio_IndicadorPagadorFlete_${t.pagador}`)
  }
  if (t.subcontratador) {
    const consignment = shipment.ele('cac:Consignment')
    cbc(consignment, 'ID', '1')
    party(consignment.ele('cac:LogisticsOperatorParty'), t.subcontratador)
  }

  const stage = shipment.ele('cac:ShipmentStage')
  if (!carrier) cbc(stage, 'TransportModeCode', t.modalidad, codeAttrs('Modalidad de traslado', '18'))
  if (carrier || t.modalidad === '02') cbc(stage.ele('cac:TransitPeriod'), 'StartDate', t.fechaTraslado)
  if (carrier && issuer.registroMtc) {
    cbc(stage.ele('cac:CarrierParty').ele('cac:PartyLegalEntity'), 'CompanyID', issuer.registroMtc)
  }
  if (t.transportista) {
    const carrierParty = stage.ele('cac:CarrierParty')
    cbc(carrierParty.ele('cac:PartyIdentification'), 'ID', t.transportista.documento, idAttrs('6'))
    const legal = carrierParty.ele('cac:PartyLegalEntity')
    cbc(legal, 'RegistrationName', t.transportista.razonSocial.trim())
    cbc(legal, 'CompanyID', t.transportista.registroMtc || '')
    cbc(stage.ele('cac:LoadingTransportEvent'), 'OccurrenceDate', t.fechaTraslado)
  }
  for (const [index, driver] of (t.conductores ?? []).entries()) {
    const person = stage.ele('cac:DriverPerson')
    cbc(person, 'ID', driver.dni, idAttrs('1'))
    cbc(person, 'FirstName', driver.nombres.trim())
    cbc(person, 'FamilyName', driver.apellidos.trim())
    cbc(person, 'JobTitle', index ? 'Secundario' : 'Principal')
    cbc(person.ele('cac:IdentityDocumentReference'), 'ID', driver.licencia)
  }

  const delivery = shipment.ele('cac:Delivery')
  address(delivery.ele('cac:DeliveryAddress'), t.llegada)
  const despatch = delivery.ele('cac:Despatch')
  address(despatch.ele('cac:DespatchAddress'), t.partida)
  if (carrier) party(despatch.ele('cac:DespatchParty'), remitente)

  if (t.vehiculo) {
    const equipment = shipment.ele('cac:TransportHandlingUnit').ele('cac:TransportEquipment')
    const vehicle = (node: UblNode, v: typeof t.vehiculo) => {
      cbc(node, 'ID', v.placa)
      if (v.tuc) cbc(node.ele('cac:ApplicableTransportMeans'), 'RegistrationNationalityID', v.tuc)
    }
    vehicle(equipment, t.vehiculo)
    for (const trailer of t.remolques ?? []) vehicle(equipment.ele('cac:AttachedTransportEquipment'), trailer)
  }

  for (const [index, item] of (t.bienes ?? []).entries()) {
    const id = index + (carrier && t.referencias?.some(ref => ref.tipo === '09' && /^\d/.test(ref.numero)) ? 2 : 1)
    const line = root.ele('cac:DespatchLine')
    cbc(line, 'ID', id)
    cbc(line, 'DeliveredQuantity', item.cantidad, { unitCode: item.unidad })
    cbc(line.ele('cac:OrderLineReference'), 'LineID', id)
    cbc(line.ele('cac:Item'), 'Description', item.descripcion.trim())
  }
  if (carrier && (!t.bienes?.length || t.referencias?.some(ref => ref.tipo === '09' && /^\d/.test(ref.numero)))) {
    const line = root.ele('cac:DespatchLine')
    cbc(line, 'ID', t.bienes?.length ? 0 : 1)
    cbc(line.ele('cac:Item'), 'Description', 'Bienes de la guía remitente referenciada')
  }
  return root.end({ prettyPrint: false })
}
