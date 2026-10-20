// ─── RENIEC / SUNAT Mock ──────────────────────────────────────────────────────
export interface PersonaNatural {
  dni: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string
  nombreCompleto: string; fechaNacimiento: string; ubigeo: string
}
export interface Empresa {
  ruc: string; razonSocial: string; nombreComercial: string
  estado: string; condicion: string; direccion: string; ubigeo: string
  tipoContribuyente: string
}

const RENIEC_DB: Record<string, PersonaNatural> = {
  '75471192': { dni:'75471192', nombres:'LUIS ENRIQUE', apellidoPaterno:'PAZ', apellidoMaterno:'UPIACHIHUA', nombreCompleto:'PAZ UPIACHIHUA LUIS ENRIQUE', fechaNacimiento:'1995-03-12', ubigeo:'CUSCO' },
  '42178956': { dni:'42178956', nombres:'ROBERTO', apellidoPaterno:'ALMANZA', apellidoMaterno:'HUANCA', nombreCompleto:'ALMANZA HUANCA ROBERTO', fechaNacimiento:'1982-07-25', ubigeo:'CUSCO' },
  '47812365': { dni:'47812365', nombres:'ANA MARIA', apellidoPaterno:'FLORES', apellidoMaterno:'QUISPE', nombreCompleto:'FLORES QUISPE ANA MARIA', fechaNacimiento:'1990-11-08', ubigeo:'AREQUIPA' },
  '31456789': { dni:'31456789', nombres:'CARLOS', apellidoPaterno:'MENDOZA', apellidoMaterno:'RIOS', nombreCompleto:'MENDOZA RIOS CARLOS', fechaNacimiento:'1978-05-14', ubigeo:'LIMA' },
  '09876543': { dni:'09876543', nombres:'JORGE LUIS', apellidoPaterno:'QUISPE', apellidoMaterno:'MAMANI', nombreCompleto:'QUISPE MAMANI JORGE LUIS', fechaNacimiento:'1970-01-30', ubigeo:'PUNO' },
  '48123456': { dni:'48123456', nombres:'MARIA ELENA', apellidoPaterno:'HUANCA', apellidoMaterno:'CCORA', nombreCompleto:'HUANCA CCORA MARIA ELENA', fechaNacimiento:'1998-09-20', ubigeo:'CUSCO' },
  '72345678': { dni:'72345678', nombres:'PEDRO ANTONIO', apellidoPaterno:'VARGAS', apellidoMaterno:'QUISPE', nombreCompleto:'VARGAS QUISPE PEDRO ANTONIO', fechaNacimiento:'1985-04-15', ubigeo:'CUSCO' },
  '65432109': { dni:'65432109', nombres:'ROSA ISABEL', apellidoPaterno:'CONDORI', apellidoMaterno:'MAMANI', nombreCompleto:'CONDORI MAMANI ROSA ISABEL', fechaNacimiento:'1992-12-03', ubigeo:'PUNO' },
  '54321098': { dni:'54321098', nombres:'DAVID', apellidoPaterno:'CCAMA', apellidoMaterno:'PUMA', nombreCompleto:'CCAMA PUMA DAVID', fechaNacimiento:'1988-06-22', ubigeo:'AREQUIPA' },
}

const SUNAT_DB: Record<string, Empresa> = {
  '20613042246': { ruc:'20613042246', razonSocial:'CILMEC S.A.C.', nombreComercial:'CILMEC', estado:'ACTIVO', condicion:'HABIDO', tipoContribuyente:'SOC.ANON.CERRADA', direccion:'AV. INDUSTRIAL 123 - PIURA', ubigeo:'PIURA' },
  '20512398741': { ruc:'20512398741', razonSocial:'IMPORTACIONES DEL SUR SAC', nombreComercial:'IMPSUR', estado:'ACTIVO', condicion:'HABIDO', tipoContribuyente:'SOC.ANON.CERRADA', direccion:'JR. COMERCIO 456 - LIMA', ubigeo:'LIMA' },
  '20456789012': { ruc:'20456789012', razonSocial:'DISTRIBUIDORA ANDINA EIRL', nombreComercial:'DISTRANDINA', estado:'ACTIVO', condicion:'HABIDO', tipoContribuyente:'EMP.IND.RESP.LTDA', direccion:'CALLE REAL 789 - CUSCO', ubigeo:'CUSCO' },
  '20111222333': { ruc:'20111222333', razonSocial:'FERRETERIA LOS ANDES SRL', nombreComercial:'LOS ANDES', estado:'ACTIVO', condicion:'HABIDO', tipoContribuyente:'SOC.RESP.LTDA', direccion:'AV. EL SOL 321 - CUSCO', ubigeo:'CUSCO' },
  '20987654321': { ruc:'20987654321', razonSocial:'TEXTILES AREQUIPA SA', nombreComercial:'TEXAREQUIPA', estado:'ACTIVO', condicion:'HABIDO', tipoContribuyente:'SOC.ANONIMA', direccion:'PARQUE INDUSTRIAL 45 - AREQUIPA', ubigeo:'AREQUIPA' },
  '20123456789': { ruc:'20123456789', razonSocial:'AGRO EXPORTACIONES PUNO EIRL', nombreComercial:'AGROEX PUNO', estado:'ACTIVO', condicion:'HABIDO', tipoContribuyente:'EMP.IND.RESP.LTDA', direccion:'AV. FLORAL 220 - PUNO', ubigeo:'PUNO' },
}

export async function consultarRENIEC(dni: string): Promise<PersonaNatural | null> {
  await new Promise(r => setTimeout(r, 700))
  return RENIEC_DB[dni] || null
}
export async function consultarSUNAT(ruc: string): Promise<Empresa | null> {
  await new Promise(r => setTimeout(r, 700))
  return SUNAT_DB[ruc] || null
}

// ─── Catálogos ────────────────────────────────────────────────────────────────
export const DESTINOS_LIST = [
  { id:'1', nombre:'CUSCO',       codigo:'CUS' },
  { id:'2', nombre:'LIMA',        codigo:'LIM' },
  { id:'3', nombre:'AREQUIPA',    codigo:'AQP' },
  { id:'4', nombre:'PIURA',       codigo:'PIU' },
  { id:'5', nombre:'TRUJILLO',    codigo:'TRU' },
  { id:'6', nombre:'PUNO',        codigo:'PUN' },
  { id:'7', nombre:'QUILLABANBA', codigo:'QUI' },
  { id:'8', nombre:'JULIACA',     codigo:'JUL' },
  { id:'9', nombre:'ABANCAY',     codigo:'ABA' },
  { id:'10',nombre:'SICUANI',     codigo:'SIC' },
]

export const TIPOS_MERCADERIA = [
  'CARGA GENERAL','ENCOMIENDA','DOCUMENTOS','FRÁGIL',
  'PERECEDERO','ELECTRODOMÉSTICOS','TEXTILES','ALIMENTOS','MAQUINARIA','REPUESTOS',
]

export const PROGRAMACIONES = [
  { id:'p1', codigo:'CUS-LIM-0800', label:'CUSCO → LIMA | 08:00',        origen:'CUSCO',  destino:'LIMA' },
  { id:'p2', codigo:'CUS-AQP-1000', label:'CUSCO → AREQUIPA | 10:00',    origen:'CUSCO',  destino:'AREQUIPA' },
  { id:'p3', codigo:'CUS-PIU-2200', label:'CUSCO → PIURA | 22:00',       origen:'CUSCO',  destino:'PIURA' },
  { id:'p4', codigo:'LIM-CUS-0900', label:'LIMA → CUSCO | 09:00',        origen:'LIMA',   destino:'CUSCO' },
  { id:'p5', codigo:'CUS-QUI-0700', label:'CUSCO → QUILLABANBA | 07:00', origen:'CUSCO',  destino:'QUILLABANBA' },
  { id:'p6', codigo:'PIU-CUS-0600', label:'PIURA → CUSCO | 06:00',       origen:'PIURA',  destino:'CUSCO' },
  { id:'p7', codigo:'AQP-CUS-0800', label:'AREQUIPA → CUSCO | 08:00',    origen:'AREQUIPA',destino:'CUSCO' },
  { id:'p8', codigo:'PUN-CUS-0700', label:'PUNO → CUSCO | 07:00',        origen:'PUNO',   destino:'CUSCO' },
]

export const IGV_RATE       = 0.18
export const COSTO_KG_DEFAULT = 5.5

export function calcularMontos(peso: number, cantidad: number, costoKg: number) {
  const subTotal = parseFloat((peso * cantidad * costoKg).toFixed(2))
  const igv      = parseFloat((subTotal * IGV_RATE).toFixed(2))
  return { subTotal, igv, total: parseFloat((subTotal + igv).toFixed(2)) }
}

let ticketCorrelativo = 631200
export function nextNumeroTicket() { return `301-0${++ticketCorrelativo}` }

// ─── Tickets en memoria ───────────────────────────────────────────────────────
import type { Ticket } from '@/types'

export const TICKETS_DB: Ticket[] = [
  {
    id:'t1', numeroTicket:'301-0631143', fechaEmision:'2026-02-11 10:05:37', fechaViaje:'2026-02-11',
    estado:'DESEMBARQUE_EN_DESTINO', tipoEntrega:'AGENCIA', tipoPago:'DESTINO',
    origen:{ id:'4', nombre:'PIURA', codigo:'PIU' }, destino:{ id:'1', nombre:'CUSCO', codigo:'CUS' },
    remitente:{ id:'1', tipo:'JURIDICO', razonSocial:'CILMEC S.A.C.', ruc:'20613042246', telefono:'999999999' },
    destinatario:{ id:'2', tipo:'NATURAL', razonSocial:'LUIS ENRIQUE PAZ UPIACHIHUA', dni:'75471192', telefono:'925202116' },
    programacion:'PIU-CUS-0600', atencion1:'', atencion2:'',
    guiasRemision:[{ codigo:'PIU-001234/5678' }],
    mercaderias:[{ tipo:'CARGA GENERAL', descripcion:'REPUESTOS INDUSTRIALES', pesoTotal:150, costoKg:5.5, cantidad:3, esPesoVolumen:false, subTotal:2475, igv:445.5, total:2920.5 }],
    subTotal:2475, igv:445.5, total:2920.5, pagado:false, usuarioCreacion:'LEYDY DIANA', anulado:false,
  },
  {
    id:'t2', numeroTicket:'301-0631089', fechaEmision:'2026-02-10 14:22:10', fechaViaje:'2026-02-10',
    estado:'EN_TRANSITO', tipoEntrega:'REPARTO', tipoPago:'ORIGEN',
    origen:{ id:'2', nombre:'LIMA', codigo:'LIM' }, destino:{ id:'1', nombre:'CUSCO', codigo:'CUS' },
    remitente:{ id:'3', tipo:'JURIDICO', razonSocial:'IMPORTACIONES DEL SUR SAC', ruc:'20512398741', telefono:'985214789' },
    destinatario:{ id:'4', tipo:'NATURAL', razonSocial:'ROBERTO ALMANZA HUANCA', dni:'42178956', telefono:'963741852' },
    programacion:'LIM-CUS-0900', atencion1:'', atencion2:'',
    guiasRemision:[{ codigo:'LIM-003456/7890' }],
    mercaderias:[{ tipo:'ENCOMIENDA', descripcion:'ROPA Y CALZADO', pesoTotal:25, costoKg:6.0, cantidad:2, esPesoVolumen:false, subTotal:300, igv:54, total:354 }],
    subTotal:300, igv:54, total:354, pagado:true, fechaPago:'2026-02-10 15:10:00', usuarioCreacion:'MARIA G.', anulado:false,
  },
  {
    id:'t3', numeroTicket:'301-0630987', fechaEmision:'2026-02-09 09:15:00', fechaViaje:'2026-02-09',
    estado:'ENTREGADO', tipoEntrega:'AGENCIA', tipoPago:'DESTINO',
    origen:{ id:'3', nombre:'AREQUIPA', codigo:'AQP' }, destino:{ id:'1', nombre:'CUSCO', codigo:'CUS' },
    remitente:{ id:'5', tipo:'NATURAL', razonSocial:'CARLOS MENDOZA RIOS', dni:'31456789', telefono:'974563210' },
    destinatario:{ id:'6', tipo:'NATURAL', razonSocial:'ANA FLORES QUISPE', dni:'47812365', telefono:'987123456' },
    programacion:'AQP-CUS-0800', atencion1:'', atencion2:'',
    guiasRemision:[],
    mercaderias:[{ tipo:'FRÁGIL', descripcion:'VAJILLA Y CRISTALERÍA', pesoTotal:10, costoKg:8.0, cantidad:1, esPesoVolumen:false, subTotal:80, igv:14.4, total:94.4 }],
    subTotal:80, igv:14.4, total:94.4, pagado:true, fechaPago:'2026-02-09 11:00:00', usuarioCreacion:'CARLOS R.', anulado:false,
  },
  {
    id:'t4', numeroTicket:'301-0631200', fechaEmision:'2026-02-24 08:30:00', fechaViaje:'2026-02-24',
    estado:'PENDIENTE', tipoEntrega:'AGENCIA', tipoPago:'DESTINO',
    origen:{ id:'1', nombre:'CUSCO', codigo:'CUS' }, destino:{ id:'7', nombre:'QUILLABANBA', codigo:'QUI' },
    remitente:{ id:'7', tipo:'JURIDICO', razonSocial:'FERRETERIA LOS ANDES SRL', ruc:'20111222333', telefono:'984512369' },
    destinatario:{ id:'8', tipo:'NATURAL', razonSocial:'JORGE LUIS QUISPE MAMANI', dni:'09876543', telefono:'976543210' },
    programacion:'CUS-QUI-0700', atencion1:'', atencion2:'',
    guiasRemision:[],
    mercaderias:[{ tipo:'MAQUINARIA', descripcion:'HERRAMIENTAS ELÉCTRICAS', pesoTotal:80, costoKg:5.5, cantidad:2, esPesoVolumen:false, subTotal:880, igv:158.4, total:1038.4 }],
    subTotal:880, igv:158.4, total:1038.4, pagado:false, usuarioCreacion:'ADMIN', anulado:false,
  },
  {
    id:'t5', numeroTicket:'301-0631201', fechaEmision:'2026-02-24 09:45:00', fechaViaje:'2026-02-24',
    estado:'PENDIENTE', tipoEntrega:'AGENCIA', tipoPago:'ORIGEN',
    origen:{ id:'1', nombre:'CUSCO', codigo:'CUS' }, destino:{ id:'2', nombre:'LIMA', codigo:'LIM' },
    remitente:{ id:'9', tipo:'JURIDICO', razonSocial:'DISTRIBUIDORA ANDINA EIRL', ruc:'20456789012', telefono:'984111222' },
    destinatario:{ id:'10', tipo:'NATURAL', razonSocial:'MARIA ELENA HUANCA CCORA', dni:'48123456', telefono:'971234567' },
    programacion:'CUS-LIM-0800', atencion1:'FRAGIL', atencion2:'',
    guiasRemision:[{ codigo:'CUS-007890/1234' },{ codigo:'CUS-007891/1234' }],
    mercaderias:[
      { tipo:'TEXTILES', descripcion:'TEJIDOS ALPACA', pesoTotal:45, costoKg:5.5, cantidad:5, esPesoVolumen:false, subTotal:1237.5, igv:222.75, total:1460.25 },
      { tipo:'DOCUMENTOS', descripcion:'CONTRATOS COMERCIALES', pesoTotal:1, costoKg:4.0, cantidad:1, esPesoVolumen:false, subTotal:4, igv:0.72, total:4.72 },
    ],
    subTotal:1241.5, igv:223.47, total:1464.97, pagado:true, fechaPago:'2026-02-24 09:50:00', usuarioCreacion:'LEYDY DIANA', anulado:false,
  },
  {
    id:'t6', numeroTicket:'301-0631115', fechaEmision:'2026-02-08 07:30:00', fechaViaje:'2026-02-08',
    estado:'DESEMBARQUE_EN_DESTINO', tipoEntrega:'REPARTO', tipoPago:'DESTINO',
    origen:{ id:'6', nombre:'PUNO', codigo:'PUN' }, destino:{ id:'1', nombre:'CUSCO', codigo:'CUS' },
    remitente:{ id:'11', tipo:'JURIDICO', razonSocial:'AGRO EXPORTACIONES PUNO EIRL', ruc:'20123456789', telefono:'951234567' },
    destinatario:{ id:'12', tipo:'NATURAL', razonSocial:'DAVID CCAMA PUMA', dni:'54321098', telefono:'962345678' },
    programacion:'PUN-CUS-0700', atencion1:'REFRIGERADO', atencion2:'',
    guiasRemision:[{ codigo:'PUN-001122/3344' }],
    mercaderias:[{ tipo:'ALIMENTOS', descripcion:'QUINUA ORGÁNICA', pesoTotal:200, costoKg:5.5, cantidad:10, esPesoVolumen:false, subTotal:11000, igv:1980, total:12980 }],
    subTotal:11000, igv:1980, total:12980, pagado:false, usuarioCreacion:'ADMIN', anulado:false,
  },
  {
    id:'t7', numeroTicket:'301-0631088', fechaEmision:'2026-02-07 14:00:00', fechaViaje:'2026-02-07',
    estado:'ENTREGADO', tipoEntrega:'AGENCIA', tipoPago:'ORIGEN',
    origen:{ id:'1', nombre:'CUSCO', codigo:'CUS' }, destino:{ id:'3', nombre:'AREQUIPA', codigo:'AQP' },
    remitente:{ id:'6', tipo:'NATURAL', razonSocial:'ANA FLORES QUISPE', dni:'47812365', telefono:'987123456' },
    destinatario:{ id:'13', tipo:'NATURAL', razonSocial:'PEDRO VARGAS QUISPE', dni:'72345678', telefono:'943215678' },
    programacion:'CUS-AQP-1000', atencion1:'', atencion2:'',
    guiasRemision:[],
    mercaderias:[{ tipo:'ELECTRODOMÉSTICOS', descripcion:'MICROONDAS Y LICUADORAS', pesoTotal:35, costoKg:7.0, cantidad:4, esPesoVolumen:false, subTotal:980, igv:176.4, total:1156.4 }],
    subTotal:980, igv:176.4, total:1156.4, pagado:true, fechaPago:'2026-02-07 14:30:00', usuarioCreacion:'CARLOS R.', anulado:false,
  },
  {
    id:'t8', numeroTicket:'301-0631056', fechaEmision:'2026-02-05 11:20:00', fechaViaje:'2026-02-05',
    estado:'ANULADO', tipoEntrega:'AGENCIA', tipoPago:'DESTINO',
    origen:{ id:'4', nombre:'PIURA', codigo:'PIU' }, destino:{ id:'1', nombre:'CUSCO', codigo:'CUS' },
    remitente:{ id:'1', tipo:'JURIDICO', razonSocial:'CILMEC S.A.C.', ruc:'20613042246', telefono:'999999999' },
    destinatario:{ id:'8', tipo:'NATURAL', razonSocial:'JORGE LUIS QUISPE MAMANI', dni:'09876543', telefono:'976543210' },
    programacion:'PIU-CUS-0600', atencion1:'', atencion2:'',
    guiasRemision:[],
    mercaderias:[{ tipo:'CARGA GENERAL', descripcion:'MATERIALES CONSTRUCCIÓN', pesoTotal:300, costoKg:5.5, cantidad:1, esPesoVolumen:false, subTotal:1650, igv:297, total:1947 }],
    subTotal:1650, igv:297, total:1947, pagado:false, usuarioCreacion:'LEYDY DIANA', anulado:true,
  },
]

// ─── Comprobantes ─────────────────────────────────────────────────────────────
export type TipoComprobante = 'BOLETA' | 'FACTURA' | 'NOTA_CREDITO'
export interface Comprobante {
  id: string; serie: string; numero: string; tipo: TipoComprobante
  fecha: string; hora: string; cliente: string; rucDni: string
  ticketRef: string; subTotal: number; igv: number; total: number
  estado: 'EMITIDO' | 'ANULADO'; pdfUrl?: string
}

export const COMPROBANTES_DB: Comprobante[] = [
  { id:'c1', serie:'B001', numero:'0000234', tipo:'BOLETA',   fecha:'2026-02-11', hora:'10:10', cliente:'LUIS ENRIQUE PAZ UPIACHIHUA', rucDni:'75471192', ticketRef:'301-0631143', subTotal:2475, igv:445.5, total:2920.5, estado:'EMITIDO' },
  { id:'c2', serie:'F001', numero:'0000089', tipo:'FACTURA',  fecha:'2026-02-10', hora:'15:12', cliente:'IMPORTACIONES DEL SUR SAC',    rucDni:'20512398741', ticketRef:'301-0631089', subTotal:300, igv:54, total:354, estado:'EMITIDO' },
  { id:'c3', serie:'B001', numero:'0000233', tipo:'BOLETA',   fecha:'2026-02-09', hora:'11:05', cliente:'ANA FLORES QUISPE',            rucDni:'47812365', ticketRef:'301-0630987', subTotal:80, igv:14.4, total:94.4, estado:'EMITIDO' },
  { id:'c4', serie:'F001', numero:'0000090', tipo:'FACTURA',  fecha:'2026-02-24', hora:'09:52', cliente:'DISTRIBUIDORA ANDINA EIRL',    rucDni:'20456789012', ticketRef:'301-0631201', subTotal:1241.5, igv:223.47, total:1464.97, estado:'EMITIDO' },
  { id:'c5', serie:'F001', numero:'0000088', tipo:'FACTURA',  fecha:'2026-02-07', hora:'14:35', cliente:'ANA FLORES QUISPE',            rucDni:'47812365', ticketRef:'301-0631088', subTotal:980, igv:176.4, total:1156.4, estado:'EMITIDO' },
  { id:'c6', serie:'B001', numero:'0000230', tipo:'BOLETA',   fecha:'2026-02-05', hora:'11:25', cliente:'CILMEC S.A.C.',               rucDni:'20613042246', ticketRef:'301-0631056', subTotal:1650, igv:297, total:1947, estado:'ANULADO' },
  { id:'c7', serie:'NC01', numero:'0000012', tipo:'NOTA_CREDITO', fecha:'2026-02-05', hora:'12:00', cliente:'CILMEC S.A.C.', rucDni:'20613042246', ticketRef:'301-0631056', subTotal:-1650, igv:-297, total:-1947, estado:'EMITIDO' },
]

// ─── Desembarque ──────────────────────────────────────────────────────────────
export type EstadoDesembarque = 'PENDIENTE_VERIFICACION' | 'VERIFICADO' | 'ENTREGADO' | 'OBSERVADO'
export interface ItemDesembarque {
  id: string; ticketId: string; numeroTicket: string
  destinatario: string; dniDestinatario: string; telefono: string
  mercaderia: string; bultos: number; peso: number
  estado: EstadoDesembarque; observacion?: string
  horaEntrega?: string; firmaUrl?: string
  manifiestoRef: string
}

export const DESEMBARQUE_DB: ItemDesembarque[] = [
  { id:'d1', ticketId:'t1', numeroTicket:'301-0631143', destinatario:'LUIS ENRIQUE PAZ UPIACHIHUA', dniDestinatario:'75471192', telefono:'925202116', mercaderia:'CARGA GENERAL - REPUESTOS INDUSTRIALES', bultos:3, peso:150, estado:'PENDIENTE_VERIFICACION', manifiestoRef:'MAN-2026-0041' },
  { id:'d2', ticketId:'t6', numeroTicket:'301-0631115', destinatario:'DAVID CCAMA PUMA', dniDestinatario:'54321098', telefono:'962345678', mercaderia:'ALIMENTOS - QUINUA ORGÁNICA', bultos:10, peso:200, estado:'PENDIENTE_VERIFICACION', manifiestoRef:'MAN-2026-0042' },
  { id:'d3', ticketId:'t3', numeroTicket:'301-0630987', destinatario:'ANA FLORES QUISPE', dniDestinatario:'47812365', telefono:'987123456', mercaderia:'FRÁGIL - VAJILLA Y CRISTALERÍA', bultos:1, peso:10, estado:'ENTREGADO', horaEntrega:'2026-02-09 11:00', manifiestoRef:'MAN-2026-0040' },
  { id:'d4', ticketId:'t2', numeroTicket:'301-0631089', destinatario:'ROBERTO ALMANZA HUANCA', dniDestinatario:'42178956', telefono:'963741852', mercaderia:'ENCOMIENDA - ROPA Y CALZADO', bultos:2, peso:25, estado:'VERIFICADO', manifiestoRef:'MAN-2026-0042' },
]

// ─── Caja / Pagos ─────────────────────────────────────────────────────────────
export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'TARJETA'
export interface PagoCaja {
  id: string; hora: string; ticket: string; remitente: string
  destinatario: string; ruta: string; monto: number
  metodoPago: MetodoPago; usuario: string
}

export const PAGOS_HOY: PagoCaja[] = [
  { id:'p1', hora:'08:15', ticket:'301-0631143', remitente:'CILMEC S.A.C.',           destinatario:'LUIS PAZ UPIACHIHUA', ruta:'PIURA → CUSCO',     monto:2920.5,  metodoPago:'EFECTIVO',      usuario:'LEYDY DIANA' },
  { id:'p2', hora:'09:42', ticket:'301-0631089', remitente:'IMPORTACIONES DEL SUR',   destinatario:'ROBERTO ALMANZA',    ruta:'LIMA → CUSCO',       monto:354,     metodoPago:'TRANSFERENCIA', usuario:'MARIA G.' },
  { id:'p3', hora:'11:00', ticket:'301-0630987', remitente:'CARLOS MENDOZA',          destinatario:'ANA FLORES',         ruta:'AREQUIPA → CUSCO',   monto:94.4,    metodoPago:'EFECTIVO',      usuario:'CARLOS R.' },
  { id:'p4', hora:'14:30', ticket:'301-0631201', remitente:'DISTRIBUIDORA ANDINA',    destinatario:'MARIA HUANCA',       ruta:'CUSCO → LIMA',       monto:1464.97, metodoPago:'YAPE',          usuario:'LEYDY DIANA' },
  { id:'p5', hora:'15:55', ticket:'301-0631251', remitente:'FERRETERIA LOS ANDES',    destinatario:'JORGE QUISPE',       ruta:'CUSCO → QUILLABANBA',monto:1038.4,  metodoPago:'EFECTIVO',      usuario:'ADMIN' },
  { id:'p6', hora:'16:20', ticket:'301-0631088', remitente:'ANA FLORES QUISPE',       destinatario:'PEDRO VARGAS',       ruta:'CUSCO → AREQUIPA',   monto:1156.4,  metodoPago:'TARJETA',       usuario:'CARLOS R.' },
  { id:'p7', hora:'17:05', ticket:'301-0631115', remitente:'AGRO EXPORTACIONES PUNO', destinatario:'DAVID CCAMA',        ruta:'PUNO → CUSCO',       monto:12980,   metodoPago:'TRANSFERENCIA', usuario:'ADMIN' },
]

// ─── Notificaciones ───────────────────────────────────────────────────────────
export type TipoNotif = 'info' | 'success' | 'warning' | 'error'
export interface Notificacion {
  id: string; tipo: TipoNotif; titulo: string; mensaje: string
  fecha: string; leida: boolean; link?: string
}

export const NOTIFICACIONES_INIT: Notificacion[] = [
  { id:'n1', tipo:'warning', titulo:'Pago pendiente', mensaje:'Ticket 301-0631143 (CILMEC S.A.C.) — S/ 2,920.50 sin cobrar. Llegó a CUSCO.', fecha:'hace 5 min', leida:false, link:'/busqueda' },
  { id:'n2', tipo:'warning', titulo:'Pago pendiente', mensaje:'Ticket 301-0631115 (AGRO EXPORTACIONES) — S/ 12,980.00 sin cobrar.', fecha:'hace 12 min', leida:false, link:'/busqueda' },
  { id:'n3', tipo:'info',    titulo:'Manifiesto listo', mensaje:'MAN-2026-0041 de PIURA llegó a CUSCO. 1 ticket pendiente de desembarque.', fecha:'hace 20 min', leida:false, link:'/manifiesto' },
  { id:'n4', tipo:'success', titulo:'Pago confirmado', mensaje:'Ticket 301-0631201 pagado por DISTRIBUIDORA ANDINA — S/ 1,464.97 via YAPE.', fecha:'hace 1 hr', leida:true, link:'/busqueda' },
  { id:'n5', tipo:'info',    titulo:'Nuevo transbordo', mensaje:'Transbordo TRANS-2026-001 LIMA→CUSCO en tránsito. ETA 6 horas.', fecha:'hace 2 hrs', leida:true, link:'/transbordo' },
  { id:'n6', tipo:'error',   titulo:'Ticket anulado', mensaje:'Ticket 301-0631056 fue anulado por LEYDY DIANA.', fecha:'hace 3 hrs', leida:true, link:'/busqueda' },
]

// ─── KPIs para Dashboard ──────────────────────────────────────────────────────
export function getKPIs() {
  const hoy = TICKETS_DB.filter(t => t.fechaEmision.startsWith('2026-02-24'))
  const pendCobro = TICKETS_DB.filter(t => !t.pagado && !t.anulado)
  const totalCobrado = PAGOS_HOY.reduce((s,p)=>s+p.monto, 0)
  const enTransito = TICKETS_DB.filter(t => t.estado === 'EN_TRANSITO')
  const desembarque = TICKETS_DB.filter(t => t.estado === 'DESEMBARQUE_EN_DESTINO')
  return {
    ticketsHoy:      hoy.length,
    montoCobradoHoy: totalCobrado,
    pendientesCobro: pendCobro.length,
    montoPendiente:  pendCobro.reduce((s,t)=>s+t.total, 0),
    enTransito:      enTransito.length,
    desembarque:     desembarque.length,
    totalMes:        TICKETS_DB.filter(t=>!t.anulado).length,
    cobradosMes:     TICKETS_DB.filter(t=>t.pagado).reduce((s,t)=>s+t.total, 0),
  }
}

// ─── Inventario ───────────────────────────────────────────────────────────────
export interface ItemInventario {
  id: string; numeroTicket: string; mercaderia: string; descripcion: string
  bultos: number; peso: number; remitente: string; destinatario: string
  origen: string; destino: string; ubicacion: string
  diasEnAlmacen: number; estado: 'EN_ALMACEN' | 'RECOGIDO' | 'DEVUELTO'
}

export const INVENTARIO_DB: ItemInventario[] = [
  { id:'i1', numeroTicket:'301-0631143', mercaderia:'CARGA GENERAL', descripcion:'REPUESTOS INDUSTRIALES', bultos:3, peso:150, remitente:'CILMEC S.A.C.', destinatario:'LUIS PAZ UPIACHIHUA', origen:'PIURA', destino:'CUSCO', ubicacion:'ESTANTE A-12', diasEnAlmacen:0, estado:'EN_ALMACEN' },
  { id:'i2', numeroTicket:'301-0631115', mercaderia:'ALIMENTOS', descripcion:'QUINUA ORGÁNICA', bultos:10, peso:200, remitente:'AGRO EXPORTACIONES PUNO', destinatario:'DAVID CCAMA PUMA', origen:'PUNO', destino:'CUSCO', ubicacion:'ZONA FRÍA B-03', diasEnAlmacen:0, estado:'EN_ALMACEN' },
  { id:'i3', numeroTicket:'301-0631002', mercaderia:'ELECTRODOMÉSTICOS', descripcion:'REFRIGERADORA LG', bultos:1, peso:65, remitente:'TIENDAS RIPLEY LIMA', destinatario:'ROSA CONDORI MAMANI', origen:'LIMA', destino:'CUSCO', ubicacion:'ESTANTE C-05', diasEnAlmacen:5, estado:'EN_ALMACEN' },
  { id:'i4', numeroTicket:'301-0630987', mercaderia:'FRÁGIL', descripcion:'VAJILLA', bultos:1, peso:10, remitente:'CARLOS MENDOZA RIOS', destinatario:'ANA FLORES QUISPE', origen:'AREQUIPA', destino:'CUSCO', ubicacion:'ENTREGADO', diasEnAlmacen:0, estado:'RECOGIDO' },
]
