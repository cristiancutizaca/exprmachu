import axios from 'axios'
import type {
  Ticket, FiltrosBusqueda, PaginatedResponse,
  Transbordo, Cliente, Destino, Mercaderia, User, Bulto
} from '@/types'
import { useAuthStore } from '@/store'

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
const normalizedBaseUrl = configuredBaseUrl.replace(/\/$/, '')
const baseURL = normalizedBaseUrl.endsWith('/api/v1')
  ? normalizedBaseUrl
  : `${normalizedBaseUrl}/api/v1`

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Interceptor: adjuntar token ──────────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem('grael-auth')
      if (raw) {
        const { state } = JSON.parse(raw)
        if (state?.token) config.headers.Authorization = `Bearer ${state.token}`
      }
    } catch {}
  }
  return config
})

// ── Interceptor: manejo de errores globales ──────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login') window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login:  (username: string, password: string) =>
    api.post<{ access_token: string; user: User }>('/auth/login', { username, password }),
  me:     () => api.get<User>('/auth/me'),
  logout: () => api.post('/auth/logout'),
  cambiarPassword: (passwordActual: string, passwordNueva: string) => api.patch('/auth/password', { passwordActual, passwordNueva }),
  resetPassword: (usuarioId: string, passwordNueva: string) => api.patch('/auth/password/reset', { usuarioId, passwordNueva }),
}

// ─── TICKETS ──────────────────────────────────────────────────────────────────
type TicketCreateInput = Omit<Partial<Ticket>, 'bultos'> & {
  bultos?: Array<Partial<Bulto>>
  numeroBultos?: number
}

export const ticketsApi = {
  buscar: (filtros: FiltrosBusqueda, page = 1, limit = 20) =>
    api.get<PaginatedResponse<Ticket>>('/tickets', { params: { ...filtros, page, limit } }),

  getById: (id: string) =>
    api.get<Ticket>(`/tickets/${id}`),

  crear: (data: TicketCreateInput) =>
    api.post<Ticket>('/tickets', data),

  actualizar: (id: string, data: Partial<Ticket>) =>
    api.patch<Ticket>(`/tickets/${id}`, data),

  anular: (id: string, motivo: string) =>
    api.patch(`/tickets/${id}/anular`, { motivo }),

  registrarPago: (id: string, metodoPago = 'EFECTIVO', monto?: number) =>
    api.patch(`/tickets/${id}/pagar`, { metodoPago, monto }),

  cambiarEstado: (id: string, estado: string) =>
    api.patch<Ticket>(`/tickets/${id}/estado`, { estado }),

  descargarOS: (filtros: FiltrosBusqueda) =>
    api.get('/tickets/exportar-os', { params: filtros, responseType: 'blob' }),

  getQR: (id: string) =>
    api.get<{ qrUrl: string }>(`/tickets/${id}/qr`),

  imprimirTicket: (id: string) =>
    api.get(`/tickets/${id}/imprimir`, { responseType: 'blob' }),
}

// ─── BULTOS / TRACKING V2 ─────────────────────────────────────────────────────
export const bultosApi = {
  listar: (params: { ticketId?: string; codigo?: string; estado?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Bulto>>('/bultos', { params }),
  crear: (data: Partial<Bulto> & { ticketId: string }) => api.post<Bulto>('/bultos', data),
  cambiarEstado: (id: string, estado: string, observacion?: string) => api.patch<Bulto>(`/bultos/${id}/estado`, { estado, observacion }),
  etiqueta: (id: string) => api.get(`/bultos/${id}/etiqueta`, { responseType: 'blob' }),
}

export const trackingApi = {
  porTicket: (ticketId: string) => api.get(`/tracking/ticket/${ticketId}`),
  porBulto: (bultoId: string) => api.get(`/tracking/bulto/${bultoId}`),
  registrar: (data: any) => api.post('/tracking', data),
  publico: (codigo: string) => api.get(`/tracking/public/${encodeURIComponent(codigo)}`),
}

export const incidenciasApi = {
  listar: (params?: { sedeId?: string; ticketId?: string; bultoId?: string; estado?: string; tipo?: string }) => api.get('/incidencias', { params }),
  crear: (data: any) => api.post('/incidencias', data),
  resolver: (id: string, data: { estado: string; resolucion?: string }) => api.patch(`/incidencias/${id}/resolver`, data),
}

export const inventarioApi = {
  listarBultos: (params?: { sedeId?: string; estado?: string; codigo?: string; ticketId?: string; almacenId?: string; ubicacionId?: string; page?: number; limit?: number }) => api.get('/inventario/bultos', { params }),
  movimientos: (params?: { sedeId?: string; bultoId?: string; tipo?: string; page?: number; limit?: number }) => api.get('/inventario/movimientos', { params }),
  mover: (data: { bultoId: string; almacenDestinoId: string; ubicacionDestinoId?: string; tipo: string; motivo: string }) => api.post('/inventario/movimientos', data),
}

export const cajaApi = {
  actual: () => api.get('/pagos/caja/actual'),
  abrir: (data: { sedeId: string; saldoInicial?: number; observacion?: string }) => api.post('/pagos/caja/abrir', data),
  movimiento: (id: string, data: { tipoMovimiento: string; monto: number; metodoPago?: string; concepto: string; metadata?: Record<string, unknown> }) => api.post(`/pagos/caja/${id}/movimientos`, data),
  cerrar: (id: string, data: { saldoDeclarado: number; observacion?: string }) => api.post(`/pagos/caja/${id}/cerrar`, data),
  delDia: (params?: { fecha?: string; sedeId?: string; page?: number; limit?: number }) => api.get('/pagos/caja-diaria', { params }),
}

export const comprobantesApi = {
  listar: (params?: { tipo?: string; estado?: string; q?: string; sedeId?: string; page?: number; limit?: number }) => api.get('/comprobantes', { params }),
  anular: (id: string, motivo: string) => api.patch(`/comprobantes/${id}/anular`, { motivo }),
}

export const desembarqueApi = {
  listar: (params?: { estado?: string; ticketId?: string }) => api.get('/desembarque', { params }),
  verificar: (id: string) => api.patch(`/desembarque/${id}/verificar`),
  entregar: (id: string, data: { dniRecibe: string; nombreRecibe: string; observacion?: string }) => api.patch(`/desembarque/${id}/entregar`, data),
  observar: (id: string, observacion: string) => api.patch(`/desembarque/${id}/observar`, { observacion }),
  abrirSesion: (data: { manifiestoId: string; almacenDestinoId: string; ubicacionDestinoId: string; observacion?: string }) => api.post('/desembarque/sesiones', data),
  resumenSesion: (id: string) => api.get(`/desembarque/sesiones/${id}/resumen`),
  escanearBulto: (id: string, data: { codigo: string; estado?: string; observacion?: string }) => api.post(`/desembarque/sesiones/${id}/bultos`, data),
  cerrarSesion: (id: string, motivo?: string) => api.post(`/desembarque/sesiones/${id}/cerrar`, { motivo }),
}

export const entregasApi = {
  listar: (params?: { ticketId?: string; bultoId?: string; estado?: string }) => api.get('/entregas', { params }),
  crear: (data: any) => api.post('/entregas', data),
  entregar: (id: string, data: any) => api.patch(`/entregas/${id}/entregar`, data),
  intentoFallido: (id: string, data: { observacion?: string }) => api.patch(`/entregas/${id}/intento-fallido`, data),
}

export const egresosApi = {
  listar: (params?: { sedeId?: string; estado?: string; categoria?: string; fechaInicio?: string; fechaFin?: string }) => api.get('/egresos', { params }),
  crear: (data: any) => api.post('/egresos', data),
  aprobar: (id: string, data?: { cajaSesionId?: string }) => api.patch(`/egresos/${id}/aprobar`, data || {}),
  rechazar: (id: string, motivo?: string) => api.patch(`/egresos/${id}/rechazar`, { motivo }),
  anular: (id: string, motivo: string) => api.patch(`/egresos/${id}/anular`, { motivo }),
}

export const auditoriaApi = {
  listar: (params?: { sedeId?: string; entidad?: string; accion?: string; page?: number; limit?: number }) => api.get('/auditoria', { params }),
}

export const configuracionApi = {
  listar: () => api.get('/configuracion'),
  all: () => api.get<Record<string, string>>('/configuracion/all'),
  set: (clave: string, valor: string, descripcion?: string) => api.patch(`/configuracion/${encodeURIComponent(clave)}`, { valor, descripcion }),
  bulk: (updates: Array<{ clave: string; valor: string }>) => api.post('/configuracion/bulk', { updates }),
}

export const reportesApi = {
  dashboard: (sedeId?: string) => api.get('/reportes/dashboard', { params: { sedeId } }),
  resumenMes: (anio: number, mes: number, sedeId?: string) => api.get('/reportes/resumen-mes', { params: { anio, mes, sedeId } }),
  comparativo: (sedeId?: string) => api.get('/reportes/comparativo', { params: { sedeId } }),
  pendientesCobro: (sedeId?: string) => api.get('/reportes/pendientes-cobro', { params: { sedeId } }),
  porMercaderia: (anio: number, mes: number, sedeId?: string) => api.get('/reportes/por-mercaderia', { params: { anio, mes, sedeId } }),
}

export const repartoApi = {
  listar: (params?: { sedeId?: string; estado?: string; fecha?: string }) => api.get('/reparto', { params }),
  detalle: (id: string) => api.get(`/reparto/${id}`),
  crear: (data: any) => api.post('/reparto', data),
  iniciar: (id: string) => api.post(`/reparto/${id}/iniciar`),
  intento: (detalleId: string, data: any) => api.patch(`/reparto/detalle/${detalleId}/intento`, data),
  retorno: (id: string, data: { almacenDestinoId: string; ubicacionDestinoId: string; observacion?: string }) => api.post(`/reparto/${id}/retorno`, data),
  finalizar: (id: string) => api.post(`/reparto/${id}/finalizar`),
}

export const catalogosV2Api = {
  sedes: (params?: { q?: string; activo?: boolean; sedeId?: string }) => api.get('/sedes', { params }),
  crearSede: (data: any) => api.post('/sedes', data),
  actualizarSede: (id: string, data: any) => api.patch(`/sedes/${id}`, data),
  almacenes: (params?: { sedeId?: string; estado?: string }) => api.get('/almacenes', { params }),
  ubicaciones: (almacenId: string) => api.get(`/almacenes/${almacenId}/ubicaciones`),
  vehiculos: (params?: { q?: string; estado?: string }) => api.get('/vehiculos', { params }),
  crearVehiculo: (data: any) => api.post('/vehiculos', data),
  actualizarVehiculo: (id: string, data: any) => api.patch(`/vehiculos/${id}`, data),
  conductores: (params?: { q?: string; estado?: string }) => api.get('/conductores', { params }),
  crearConductor: (data: any) => api.post('/conductores', data),
  actualizarConductor: (id: string, data: any) => api.patch(`/conductores/${id}`, data),
  tarifas: (params?: { origenId?: string; destinoId?: string; activo?: boolean }) => api.get('/tarifas', { params }),
  crearTarifa: (data: any) => api.post('/tarifas', data),
  actualizarTarifa: (id: string, data: any) => api.patch(`/tarifas/${id}`, data),
}

// ─── TRANSBORDO ───────────────────────────────────────────────────────────────
export const transbordoApi = {
  listar: (params: {
    sedeId?: string; origenId?: string; destinoId?: string; desembarqueId?: string;
    estado?: string; fechaInicio?: string; fechaFin?: string; page?: number; limit?: number
  }) =>
    api.get<PaginatedResponse<Transbordo>>('/transbordo', { params }),

  getById: (id: string) =>
    api.get<Transbordo>(`/transbordo/${id}`),

  crear: (data: Partial<Transbordo>) =>
    api.post<Transbordo>('/transbordo', data),

  agregarTicket: (transbordoId: string, ticketId: string) =>
    api.post(`/transbordo/${transbordoId}/tickets`, { ticketId }),

  descargarManifiesto: (id: string) =>
    api.get(`/transbordo/${id}/manifiesto`, { responseType: 'blob' }),

  cambiarEstado: (id: string, estado: string) =>
    api.patch<Transbordo>(`/transbordo/${id}/estado`, { estado }),

  despachar: (id: string) => api.patch<Transbordo>(`/transbordo/${id}/estado`, { estado: 'EN_TRANSITO' }),

  actualizarFlota: (id: string, data: { vehiculoNuevoId?: string; conductorNuevoId?: string; motivo?: string }) =>
    api.patch<Transbordo>(`/transbordo/${id}/flota`, data),
}

// ─── MANIFIESTO / DESPACHO V2 ────────────────────────────────────────────────
export const manifiestoApi = {
  listar: (params?: { estado?: string; sedeId?: string; page?: number; limit?: number }) => api.get('/manifiesto', { params }),
  getById: (id: string) => api.get(`/manifiesto/${id}`),
  crear: (data: any) => api.post('/manifiesto', data),
  agregarTickets: (id: string, ticketIds: string[]) => api.post(`/manifiesto/${id}/tickets`, { ticketIds }),
  asignarFlota: (id: string, data: { vehiculoId?: string; conductorId?: string }) => api.patch(`/manifiesto/${id}/flota`, data),
  cambiarEstado: (id: string, estado: string) => api.patch(`/manifiesto/${id}/estado`, { estado }),
  resumenCarga: (id: string) => api.get(`/manifiesto/${id}/carga`),
  resumenLlegada: (id: string) => api.get(`/manifiesto/${id}/llegada/resumen`),
  cargarBulto: (id: string, codigo: string) => api.post(`/manifiesto/${id}/carga/bulto`, { codigo }),
  despachar: (id: string) => api.post(`/manifiesto/${id}/despachar`),
  llegada: (id: string) => api.post(`/manifiesto/${id}/llegada`),
}

// ─── CLIENTES ────────────────────────────────────────────────────────────────
export const clientesApi = {
  buscar:   (q: string) => api.get<Cliente[]>('/clientes/buscar', { params: { q } }),
  getById:  (id: string) => api.get<Cliente>(`/clientes/${id}`),
  byDniRuc: (dniRuc: string) => api.get<Cliente>(`/clientes/dni-ruc/${dniRuc}`),
  crear:    (data: Partial<Cliente>) => api.post<Cliente>('/clientes', data),
}

// ─── DESTINOS ────────────────────────────────────────────────────────────────
export const destinosApi = {
  listar: () => api.get<Destino[]>('/destinos'),
}

// ─── MERCADERÍA ───────────────────────────────────────────────────────────────
export const mercaderiaApi = {
  tiposLista: () => api.get<string[]>('/mercaderia/tipos'),
  calcularCosto: (tipo: string, peso: number) =>
    api.get<{ costoKg: number; subTotal: number; igv: number; total: number }>(
      '/mercaderia/calcular', { params: { tipo, peso } }
    ),
}

export default api
