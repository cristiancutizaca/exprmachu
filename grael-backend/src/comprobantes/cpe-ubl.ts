import { hoyPeru } from '../common/peru-time'
import { Issuer } from '../sunat/sunat-config'
import { textNode as cbc, ublRoot, ublSignature } from '../sunat/sunat-xml'
import { CpeType } from './cpe.dto'

export type CpeSnapshot = {
  issuer: Issuer
  buyer: { tipo: '1' | '6'; doc: string; nombre: string }
  tipo: CpeType
  serie: string
  establecimiento: string
  ticket: string
  importeCentimos: number
  netoCentimos: number
  igvCentimos: number
  formaPago: 'Contado' | 'Credito'
  saldoCentimos: number
  vencimiento?: string
  detraccion?: { cuenta: string; valorReferencial?: number; monto: number }
}

const currency = { currencyID: 'PEN' }
const taxName = { schemeName: 'Código de tributos', schemeAgencyName: 'PE:SUNAT', schemeURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo05' }
const documentAttrs = (schemeID: string) => ({
  schemeID, schemeName: 'Documento de Identidad', schemeAgencyName: 'PE:SUNAT', schemeURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06',
})
const decimal = (cents: number) => (cents / 100).toFixed(2)

function taxScheme(category: ReturnType<typeof ublRoot>) {
  const scheme = category.ele('cac:TaxScheme')
  cbc(scheme, 'ID', '1000', taxName)
  cbc(scheme, 'Name', 'IGV')
  cbc(scheme, 'TaxTypeCode', 'VAT')
}

export function buildCpeXml(cpe: CpeSnapshot, numero: string, now = new Date()) {
  const root = ublRoot('Invoice')
  cbc(root, 'UBLVersionID', '2.1')
  cbc(root, 'CustomizationID', '2.0', { schemeAgencyName: 'PE:SUNAT' })
  cbc(root, 'ID', `${cpe.serie}-${numero}`)
  cbc(root, 'IssueDate', hoyPeru(now))
  cbc(root, 'IssueTime', new Date(now.getTime() - 5 * 3600000).toISOString().slice(11, 19))
  cbc(root, 'InvoiceTypeCode', cpe.tipo, {
    listAgencyName: 'PE:SUNAT', listName: 'Tipo de Documento', listURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01',
    listID: cpe.detraccion ? '1001' : '0101', name: 'Tipo de Operacion',
  })
  if (cpe.detraccion) {
    cbc(root, 'Note', 'Operación sujeta al Sistema de Pago de Obligaciones Tributarias con el Gobierno Central', { languageLocaleID: '2006' })
    if (cpe.detraccion.valorReferencial) cbc(root, 'Note', `Valor referencial del transporte S/ ${cpe.detraccion.valorReferencial.toFixed(2)}`)
  }
  cbc(root, 'DocumentCurrencyCode', 'PEN', { listID: 'ISO 4217 Alpha', listName: 'Currency', listAgencyName: 'United Nations Economic Commission for Europe' })
  cbc(root, 'LineCountNumeric', 1)
  ublSignature(root, cpe.issuer)

  const supplier = root.ele('cac:AccountingSupplierParty').ele('cac:Party')
  cbc(supplier.ele('cac:PartyIdentification'), 'ID', cpe.issuer.ruc, documentAttrs('6'))
  const legal = supplier.ele('cac:PartyLegalEntity')
  cbc(legal, 'RegistrationName', cpe.issuer.razonSocial)
  const address = legal.ele('cac:RegistrationAddress')
  if (cpe.issuer.ubigeo) cbc(address, 'ID', cpe.issuer.ubigeo, { schemeName: 'Ubigeos', schemeAgencyName: 'PE:INEI' })
  cbc(address, 'AddressTypeCode', cpe.establecimiento, { listAgencyName: 'PE:SUNAT', listName: 'Establecimientos anexos' })
  cbc(address.ele('cac:AddressLine'), 'Line', cpe.issuer.direccion)
  cbc(address.ele('cac:Country'), 'IdentificationCode', 'PE')

  const buyer = root.ele('cac:AccountingCustomerParty').ele('cac:Party')
  cbc(buyer.ele('cac:PartyIdentification'), 'ID', cpe.buyer.doc, documentAttrs(cpe.buyer.tipo))
  cbc(buyer.ele('cac:PartyLegalEntity'), 'RegistrationName', cpe.buyer.nombre)
  if (cpe.detraccion) {
    const means = root.ele('cac:PaymentMeans')
    cbc(means, 'ID', 'Detraccion')
    cbc(means, 'PaymentMeansCode', '001')
    cbc(means.ele('cac:PayeeFinancialAccount'), 'ID', cpe.detraccion.cuenta)
    const terms = root.ele('cac:PaymentTerms')
    cbc(terms, 'ID', 'Detraccion')
    cbc(terms, 'PaymentMeansID', '027')
    cbc(terms, 'PaymentPercent', '4.00')
    cbc(terms, 'Amount', cpe.detraccion.monto.toFixed(2), currency)
  }
  if (cpe.tipo === '01') {
    const terms = root.ele('cac:PaymentTerms')
    cbc(terms, 'ID', 'FormaPago')
    cbc(terms, 'PaymentMeansID', cpe.formaPago)
    if (cpe.formaPago === 'Credito') {
      cbc(terms, 'Amount', decimal(cpe.saldoCentimos), currency)
      const installment = root.ele('cac:PaymentTerms')
      cbc(installment, 'ID', 'FormaPago')
      cbc(installment, 'PaymentMeansID', 'Cuota001')
      cbc(installment, 'Amount', decimal(cpe.saldoCentimos), currency)
      cbc(installment, 'PaymentDueDate', cpe.vencimiento)
    }
  }

  const addTax = (parent: ReturnType<typeof ublRoot>, detail = false) => {
    const total = parent.ele('cac:TaxTotal')
    cbc(total, 'TaxAmount', decimal(cpe.igvCentimos), currency)
    const sub = total.ele('cac:TaxSubtotal')
    cbc(sub, 'TaxableAmount', decimal(cpe.netoCentimos), currency)
    cbc(sub, 'TaxAmount', decimal(cpe.igvCentimos), currency)
    const category = sub.ele('cac:TaxCategory')
    if (detail) {
      cbc(category, 'Percent', '18.00')
      cbc(category, 'TaxExemptionReasonCode', '10', { listAgencyName: 'PE:SUNAT', listName: 'Afectacion del IGV', listURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07' })
    }
    taxScheme(category)
  }
  addTax(root)
  const total = root.ele('cac:LegalMonetaryTotal')
  cbc(total, 'LineExtensionAmount', decimal(cpe.netoCentimos), currency)
  cbc(total, 'TaxInclusiveAmount', decimal(cpe.importeCentimos), currency)
  cbc(total, 'PayableAmount', decimal(cpe.importeCentimos), currency)

  const line = root.ele('cac:InvoiceLine')
  cbc(line, 'ID', 1)
  cbc(line, 'InvoicedQuantity', 1, { unitCode: 'ZZ', unitCodeListID: 'UN/ECE rec 20', unitCodeListAgencyName: 'United Nations Economic Commission for Europe' })
  cbc(line, 'LineExtensionAmount', decimal(cpe.netoCentimos), currency)
  const price = line.ele('cac:PricingReference').ele('cac:AlternativeConditionPrice')
  cbc(price, 'PriceAmount', decimal(cpe.importeCentimos), currency)
  cbc(price, 'PriceTypeCode', '01', { listName: 'Tipo de Precio', listAgencyName: 'PE:SUNAT', listURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16' })
  addTax(line, true)
  cbc(line.ele('cac:Item'), 'Description', `Servicio de transporte de carga - Ticket ${cpe.ticket}`)
  cbc(line.ele('cac:Price'), 'PriceAmount', decimal(cpe.netoCentimos), currency)
  return root.end()
}
