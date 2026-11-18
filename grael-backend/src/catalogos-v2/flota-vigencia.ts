import { hoyPeru } from '../common/peru-time'
import { Conductor, Vehiculo } from '../database/entities/flota.entity'

function documento(nombre: string, valor: string, vence?: Date | string, fecha = hoyPeru()) {
  const vencimiento = vence instanceof Date ? vence.toISOString().slice(0, 10) : vence
  return {
    nombre, vencimiento: vencimiento || null,
    estado: vencimiento && vencimiento < fecha ? 'VENCIDO' : valor && vencimiento ? 'VIGENTE_SEGUN_REGISTRO' : 'PENDIENTE_DE_VERIFICACION',
  }
}

export const licenciaRegistrada = (conductor: Conductor, fecha?: string) =>
  documento('Licencia', conductor.licencia, conductor.fechaVencimientoLicencia, fecha)

export const documentosVehiculo = (vehiculo: Vehiculo, fecha?: string) => [
  documento('Habilitación', vehiculo.tuc || vehiculo.habilitacionMtc, vehiculo.fechaVencimientoHabilitacion, fecha),
  documento('SOAT', vehiculo.soat, vehiculo.fechaVencimientoSoat, fecha),
  documento('Inspección técnica', vehiculo.citv, vehiculo.fechaVencimientoCitv, fecha),
]
