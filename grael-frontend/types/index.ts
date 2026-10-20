// ─── AUTH ────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  nombre: string
  apellido: string
  username: string
  sede: string
  sedeId?: string
  rol: 'ADMIN_SEDE' | 'OPERADOR' | 'SUPERVISOR' | 'CAJERO' | 'ALMACEN' | 'REPARTIDOR' | 'AUDITOR' | 'SUPERADMIN' | string
  email?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

// ─── DESTINOS / CLIENTES ──────────────────────────────────────────────────────
export interface Destino {
  id: string
  nombre: string
  codigo: string
}

export interface Cliente {
  id: string
  tipo: 'NATURAL' | 'JURIDICO'
  razonSocial: string
  ruc?: string
  dni?: string
  telefono?: string
  email?: string
}

// ─── TICKET ──────────────────────────────────────────────────────────────────
export type TipoEntrega   = 'AGENCIA' | 'REPARTO'
export type TipoPago      = 'ORIGEN'  | 'DESTINO'
export type EstadoTicket  =
  | 'PENDIENTE'
  | 'EN_TRANSITO'
  | 'DESEMBARQUE_EN_DESTINO'
  | 'ENTREGADO'
  | 'ANULADO'

export interface Mercaderia {
  id?:            string
  tipo:           string
  descripcion:    string
  pesoTotal:      number
  costoKg:        number
  cantidad:       number
  numeroBultos?:  number
  esPesoVolumen:  boolean
  subTotal:       number
  igv:            number
  total:          number
}

export interface GRR {
  id?:    string
  codigo: string
}

export type EstadoBulto =
  | 'RECEPCIONADO' | 'EN_ALMACEN' | 'PROGRAMADO' | 'CARGADO' | 'EN_TRANSITO'
  | 'TRANSBORDO' | 'LLEGADO' | 'DESEMBARCADO' | 'LISTO_RECOJO' | 'EN_REPARTO'
  | 'ENTREGADO' | 'OBSERVADO' | 'FALTANTE' | 'DEVUELTO' | 'ANULADO'

export interface Bulto {
  id?: string
  codigo: string
  numero: number
  tipo?: string
  descripcion?: string
  cantidad?: number
  pesoReal?: number
  pesoVolumetrico?: number
  alto?: number
  ancho?: number
  largo?: number
  valorDeclarado?: number
  fragil?: boolean
  requiereCuidado?: boolean
  codigoBarras?: string
  qrPayload?: string
  estado: EstadoBulto
  ticketId?: string
}

export interface Ticket {
  id:               string
  numeroTicket:     string
  fechaEmision:     string
  fechaViaje:       string
  estado:           EstadoTicket
  tipoEntrega:      TipoEntrega
  tipoPago:         TipoPago
  origen:           Destino
  destino:          Destino
  remitente:        Cliente
  destinatario:     Cliente
  programacion?:    string
  atencion1?:       string
  atencion2?:       string
  guiasRemision:    GRR[]
  mercaderias:      Mercaderia[]
  bultos?:          Bulto[]
  numeroBultos?:    number
  subTotal:         number
  igv:              number
  total:            number
  pagado:           boolean
  fechaPago?:       string
  usuarioCreacion:  string
  anulado:          boolean
}

// ─── FILTROS BÚSQUEDA ─────────────────────────────────────────────────────────
export interface FiltrosBusqueda {
  numeroTicket?:         string
  dniRuc?:               string
  origenId?:             string
  destinoId?:            string
  anulado?:              boolean | null
  estado?:               EstadoTicket | ''
  tipoCliente?:          'NATURAL' | 'JURIDICO' | 'TODOS'
  pagado?:               boolean | null
  filtrarPor?:           'FECHA_EMISION' | 'FECHA_VIAJE' | ''
  tipoEntrega?:          TipoEntrega | ''
  fechaInicio?:          string
  fechaFin?:             string
  guiaRemisionRemitente?: string
}

// ─── TRANSBORDO ───────────────────────────────────────────────────────────────
export type EstadoTransbordo = 'ABIERTO' | 'EN_TRANSITO' | 'LLEGADO' | 'CERRADO'

export interface Transbordo {
  id:             string
  codigo:         string
  fechaCreacion:  string
  estado:         EstadoTransbordo
  origen:         Destino
  destino:        Destino
  desembarqueEn?: Destino
  tickets:        Ticket[]
  totalBultos:    number
  totalPeso:      number
  usuarioCreacion: string
}

// ─── PAGINACIÓN ───────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data:       T[]
  total:      number
  page:       number
  limit:      number
  totalPages: number
}

// ─── SIDEBAR NAV ─────────────────────────────────────────────────────────────
export interface NavItem {
  key:    string
  label:  string
  href:   string
  icon:   string
}
