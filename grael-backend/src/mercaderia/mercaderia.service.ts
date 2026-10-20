import { Injectable } from '@nestjs/common'
const TIPOS = ['CARGA GENERAL','ENCOMIENDA','DOCUMENTOS','FRAGIL','PERECEDERO','ELECTRODOMESTICOS','TEXTILES','ALIMENTOS','MAQUINARIA','REPUESTOS']
const COSTOS: Record<string,number> = { 'CARGA GENERAL':5.5,'ENCOMIENDA':6.0,'DOCUMENTOS':4.0,'FRAGIL':8.0,'PERECEDERO':9.0,'ELECTRODOMESTICOS':7.0,'TEXTILES':5.5,'ALIMENTOS':5.5,'MAQUINARIA':6.5,'REPUESTOS':6.0 }
@Injectable()
export class MercaderiaService {
  tiposLista() { return TIPOS }
  calcularCosto(tipo: string, peso: number, cantidad: number = 1) {
    const costoKg = COSTOS[tipo]||5.5
    const subTotal = parseFloat((peso * cantidad * costoKg).toFixed(2))
    const igv      = parseFloat((subTotal * 0.18).toFixed(2))
    return { costoKg, subTotal, igv, total: parseFloat((subTotal+igv).toFixed(2)) }
  }
}
