import 'reflect-metadata'
import { AppDataSource } from '../data-source'
import * as bcrypt from 'bcryptjs'
import { Usuario, RolUsuario }       from '../entities/usuario.entity'
import { Destino }                   from '../entities/destino.entity'
import { Cliente, TipoCliente }      from '../entities/cliente.entity'
import { Programacion }              from '../entities/programacion.entity'
import { Ticket, EstadoTicket, TipoEntrega, TipoPago } from '../entities/ticket.entity'
import { GuiaRemision, MercaderiaItem } from '../entities/mercaderia-item.entity'
import { Pago, MetodoPago }          from '../entities/operaciones.entity'
import { Desembarque, EstadoDesembarque } from '../entities/operaciones.entity'
import { Configuracion } from '../entities/configuracion.entity'
import { Sede, TipoSede } from '../entities/sede.entity'
import { Almacen, TipoAlmacen, UbicacionAlmacen, TipoUbicacionAlmacen } from '../entities/almacen.entity'
import { Vehiculo, EstadoVehiculo, Conductor, EstadoConductor } from '../entities/flota.entity'
import { Tarifa } from '../entities/tarifa.entity'
import { Bulto, EstadoBulto } from '../entities/bulto.entity'
import { TrackingEvento, TipoTrackingEvento } from '../entities/tracking-evento.entity'
import { Entrega, EstadoEntrega, TipoEntregaV2 } from '../entities/entrega.entity'

async function runSeeds() {
  await AppDataSource.initialize()
  console.log('📦 Conectado a PostgreSQL. Iniciando seeds...\n')

  const queryRunner = AppDataSource.createQueryRunner()
  await queryRunner.startTransaction()

  try {
    // ── 1. DESTINOS ───────────────────────────────────────────────────────────
    console.log('  → Sembrando destinos...')
    const destinoRepo = AppDataSource.getRepository(Destino)
    const destinosData = [
      { nombre:'CUSCO',        codigo:'CUS', departamento:'Cusco',        provincia:'Cusco' },
      { nombre:'LIMA',         codigo:'LIM', departamento:'Lima',         provincia:'Lima' },
      { nombre:'AREQUIPA',     codigo:'AQP', departamento:'Arequipa',     provincia:'Arequipa' },
      { nombre:'PIURA',        codigo:'PIU', departamento:'Piura',        provincia:'Piura' },
      { nombre:'TRUJILLO',     codigo:'TRU', departamento:'La Libertad',  provincia:'Trujillo' },
      { nombre:'PUNO',         codigo:'PUN', departamento:'Puno',         provincia:'Puno' },
      { nombre:'QUILLABANBA',  codigo:'QUI', departamento:'Cusco',        provincia:'La Convención' },
      { nombre:'JULIACA',      codigo:'JUL', departamento:'Puno',         provincia:'San Román' },
      { nombre:'ABANCAY',      codigo:'ABA', departamento:'Apurímac',     provincia:'Abancay' },
      { nombre:'SICUANI',      codigo:'SIC', departamento:'Cusco',        provincia:'Canchis' },
    ]
    const destinos: Record<string, Destino> = {}
    for (const d of destinosData) {
      const ex = await destinoRepo.findOneBy({ codigo: d.codigo })
      if (!ex) {
        const saved = await destinoRepo.save(destinoRepo.create(d))
        destinos[d.codigo] = saved
      } else {
        destinos[d.codigo] = ex
      }
    }
    console.log(`     ✓ ${Object.keys(destinos).length} destinos`)

    // ── 1.1 SEDES Y ALMACENES V2 ─────────────────────────────────────────────
    console.log('  → Sembrando sedes y almacenes V2...')
    const sedeRepo = AppDataSource.getRepository(Sede)
    const almacenRepo = AppDataSource.getRepository(Almacen)
    const ubicacionRepo = AppDataSource.getRepository(UbicacionAlmacen)
    const sedes: Record<string, Sede> = {}
    const sedesData = [
      { codigo:'CUS', nombre:'GRAEL Agencia Cusco', tipo:TipoSede.AGENCIA, departamento:'Cusco', provincia:'Cusco', distrito:'Cusco', direccion:'Av. El Sol 123' },
      { codigo:'LIM', nombre:'GRAEL Sede Lima', tipo:TipoSede.SEDE_PRINCIPAL, departamento:'Lima', provincia:'Lima', distrito:'Lima', direccion:'Av. Argentina 100' },
      { codigo:'AQP', nombre:'GRAEL Agencia Arequipa', tipo:TipoSede.AGENCIA, departamento:'Arequipa', provincia:'Arequipa', distrito:'Arequipa', direccion:'Av. Ejército 200' },
      { codigo:'JUL', nombre:'GRAEL Agencia Juliaca', tipo:TipoSede.AGENCIA, departamento:'Puno', provincia:'San Román', distrito:'Juliaca', direccion:'Jr. Lima 300' },
    ]
    for (const data of sedesData) {
      const existing = await sedeRepo.findOneBy({ codigo:data.codigo })
      sedes[data.codigo] = existing || await sedeRepo.save(sedeRepo.create(data))
    }
    for (const [codigo, sede] of Object.entries(sedes)) {
      const existing = await almacenRepo.findOneBy({ sedeId:sede.id, codigo:'PRINCIPAL' })
      const almacen = existing || await almacenRepo.save(almacenRepo.create({ sedeId:sede.id, codigo:'PRINCIPAL', nombre:`Almacén principal ${codigo}`, tipo:TipoAlmacen.PRINCIPAL }))
      for (const zona of [
        { codigo:'RECEPCION', nombre:'Recepción', tipo:TipoUbicacionAlmacen.RECEPCION },
        { codigo:'ZONA-A', nombre:'Zona A', tipo:TipoUbicacionAlmacen.ZONA },
        { codigo:'TRANSBORDO', nombre:'Transbordo', tipo:TipoUbicacionAlmacen.TRANSBORDO },
        { codigo:'REPARTO', nombre:'Reparto', tipo:TipoUbicacionAlmacen.REPARTO },
        { codigo:'ENTREGADOS', nombre:'Entregados', tipo:TipoUbicacionAlmacen.ENTREGADOS },
      ]) {
        if (!(await ubicacionRepo.findOneBy({ almacenId:almacen.id, codigo:zona.codigo }))) {
          await ubicacionRepo.save(ubicacionRepo.create({ ...zona, almacenId:almacen.id }))
        }
      }
    }
    for (const codigo of Object.keys(sedes)) {
      const destino = destinos[codigo]
      const sede = sedes[codigo]
      if (destino && sede && destino.sedeId !== sede.id) {
        destino.sedeId = sede.id
        await destinoRepo.save(destino)
      }
    }
    console.log(`     ✓ ${Object.keys(sedes).length} sedes V2`)

    // ── 2. USUARIOS ───────────────────────────────────────────────────────────
    console.log('  → Sembrando usuarios...')
    const usuarioRepo = AppDataSource.getRepository(Usuario)
    const usuariosData = [
      { username:'jesus.cutisaca', nombre:'JESUS SAMUEL', apellido:'CUTISACA BUSTAMANTE', email:'jesus.cutisaca@grael.pe', rol:RolUsuario.ADMIN_SEDE,  sede:'CUSCO',   password:'admin123' },
      { username:'leydy.diana',    nombre:'LEYDY DIANA',  apellido:'FLORES QUISPE',        email:'leydy.diana@grael.pe',    rol:RolUsuario.OPERADOR,    sede:'CUSCO',   password:'op123' },
      { username:'maria.garcia',   nombre:'MARIA',        apellido:'GARCIA LIMA',          email:'maria.garcia@grael.pe',   rol:RolUsuario.CAJERO,      sede:'CUSCO',   password:'caj123' },
      { username:'carlos.ramos',   nombre:'CARLOS',       apellido:'RAMOS QUISPE',         email:'carlos.ramos@grael.pe',   rol:RolUsuario.OPERADOR,    sede:'CUSCO',   password:'op123' },
      { username:'supervisor',     nombre:'ADMIN',        apellido:'SUPERVISOR',           email:'supervisor@grael.pe',     rol:RolUsuario.SUPERVISOR,  sede:'CUSCO',   password:'super123' },
      { username:'superadmin',      nombre:'ADMIN',        apellido:'NACIONAL',             email:'superadmin@grael.pe',      rol:RolUsuario.SUPERADMIN,   sede:'LIMA',    password:'superadmin123' },
      { username:'almacen.cusco',   nombre:'OPERADOR',     apellido:'ALMACEN CUSCO',        email:'almacen.cusco@grael.pe',   rol:RolUsuario.ALMACEN,      sede:'CUSCO',   password:'almacen123' },
      { username:'repartidor.cusco',nombre:'REPARTIDOR',   apellido:'CUSCO',                email:'repartidor.cusco@grael.pe',rol:RolUsuario.REPARTIDOR,   sede:'CUSCO',   password:'reparto123' },
      { username:'auditor',         nombre:'AUDITOR',      apellido:'NACIONAL',             email:'auditor@grael.pe',          rol:RolUsuario.AUDITOR,      sede:'LIMA',    password:'auditor123' },
    ]
    const usuarios: Record<string, Usuario> = {}
    for (const u of usuariosData) {
      const ex = await usuarioRepo.findOneBy({ username: u.username })
      const sedeEntidad = Object.values(sedes).find(sede => sede.nombre.toUpperCase().includes(u.sede.toUpperCase()))
      if (!ex) {
        const hash   = await bcrypt.hash(u.password, 10)
        const { password, ...rest } = u
        const saved  = await usuarioRepo.save(usuarioRepo.create({ ...rest, password: hash, sedeId: sedeEntidad?.id }))
        usuarios[u.username] = saved
      } else {
        if (!ex.sedeId && sedeEntidad) { ex.sedeId = sedeEntidad.id; await usuarioRepo.save(ex) }
        usuarios[u.username] = ex
      }
    }
    console.log(`     ✓ ${Object.keys(usuarios).length} usuarios`)

    // ── 3. PROGRAMACIONES ─────────────────────────────────────────────────────
    console.log('  → Sembrando programaciones...')
    const progRepo = AppDataSource.getRepository(Programacion)
    const progsData = [
      { codigo:'CUS-LIM-0800', origenCod:'CUS', destinoCod:'LIM', horaSalida:'08:00:00' },
      { codigo:'CUS-AQP-1000', origenCod:'CUS', destinoCod:'AQP', horaSalida:'10:00:00' },
      { codigo:'CUS-PIU-2200', origenCod:'CUS', destinoCod:'PIU', horaSalida:'22:00:00' },
      { codigo:'LIM-CUS-0900', origenCod:'LIM', destinoCod:'CUS', horaSalida:'09:00:00' },
      { codigo:'CUS-QUI-0700', origenCod:'CUS', destinoCod:'QUI', horaSalida:'07:00:00' },
      { codigo:'PIU-CUS-0600', origenCod:'PIU', destinoCod:'CUS', horaSalida:'06:00:00' },
      { codigo:'AQP-CUS-0800', origenCod:'AQP', destinoCod:'CUS', horaSalida:'08:00:00' },
      { codigo:'PUN-CUS-0700', origenCod:'PUN', destinoCod:'CUS', horaSalida:'07:00:00' },
    ]
    const progs: Record<string, Programacion> = {}
    for (const p of progsData) {
      const ex = await progRepo.findOneBy({ codigo: p.codigo })
      if (!ex) {
        const saved = await progRepo.save(progRepo.create({
          codigo: p.codigo,
          origen:  destinos[p.origenCod],
          destino: destinos[p.destinoCod],
          horaSalida: p.horaSalida,
        }))
        progs[p.codigo] = saved
      } else {
        progs[p.codigo] = ex
      }
    }
    console.log(`     ✓ ${Object.keys(progs).length} programaciones`)

    // ── 4. CLIENTES ───────────────────────────────────────────────────────────
    console.log('  → Sembrando clientes...')
    const clienteRepo = AppDataSource.getRepository(Cliente)
    const clientesData = [
      { tipo:TipoCliente.JURIDICO, razonSocial:'CILMEC S.A.C.',               ruc:'20613042246', telefono:'999999999', email:'cilmec@email.com',     direccion:'AV. INDUSTRIAL 123 - PIURA' },
      { tipo:TipoCliente.NATURAL,  razonSocial:'LUIS ENRIQUE PAZ UPIACHIHUA',  dni:'75471192',    telefono:'925202116', email:'lpaz@email.com',       direccion:'JR. PUNO 234 - CUSCO' },
      { tipo:TipoCliente.JURIDICO, razonSocial:'IMPORTACIONES DEL SUR SAC',   ruc:'20512398741', telefono:'985214789', email:'impsur@email.com',     direccion:'JR. COMERCIO 456 - LIMA' },
      { tipo:TipoCliente.NATURAL,  razonSocial:'ROBERTO ALMANZA HUANCA',       dni:'42178956',    telefono:'963741852', email:'ralmanza@email.com',   direccion:'AV. EL SOL 789 - CUSCO' },
      { tipo:TipoCliente.NATURAL,  razonSocial:'CARLOS MENDOZA RIOS',          dni:'31456789',    telefono:'974563210', email:'cmendoza@email.com',   direccion:'AV. LAS FLORES 12 - AREQUIPA' },
      { tipo:TipoCliente.NATURAL,  razonSocial:'ANA FLORES QUISPE',            dni:'47812365',    telefono:'987123456', email:'aflores@email.com',    direccion:'AV. TUPAC 500 - AREQUIPA' },
      { tipo:TipoCliente.JURIDICO, razonSocial:'FERRETERIA LOS ANDES SRL',    ruc:'20111222333', telefono:'984512369', email:'losandes@email.com',   direccion:'AV. EL SOL 321 - CUSCO' },
      { tipo:TipoCliente.NATURAL,  razonSocial:'JORGE LUIS QUISPE MAMANI',     dni:'09876543',    telefono:'976543210', email:'jquispe@email.com',    direccion:'JR. LIMA 45 - PUNO' },
      { tipo:TipoCliente.JURIDICO, razonSocial:'DISTRIBUIDORA ANDINA EIRL',   ruc:'20456789012', telefono:'984111222', email:'distrandina@email.com',direccion:'CALLE REAL 789 - CUSCO' },
      { tipo:TipoCliente.NATURAL,  razonSocial:'MARIA ELENA HUANCA CCORA',     dni:'48123456',    telefono:'971234567', email:'mhuanca@email.com',    direccion:'JR. GARCILASO 100 - CUSCO' },
      { tipo:TipoCliente.JURIDICO, razonSocial:'AGRO EXPORTACIONES PUNO EIRL',ruc:'20123456789', telefono:'951234567', email:'agroex@email.com',     direccion:'AV. FLORAL 220 - PUNO' },
      { tipo:TipoCliente.NATURAL,  razonSocial:'DAVID CCAMA PUMA',             dni:'54321098',    telefono:'962345678', email:'dccama@email.com',     direccion:'JR. TUMBES 33 - AREQUIPA' },
      { tipo:TipoCliente.NATURAL,  razonSocial:'PEDRO ANTONIO VARGAS QUISPE',  dni:'72345678',    telefono:'943215678', email:'pvargas@email.com',    direccion:'AV. CULTURA 700 - CUSCO' },
    ]
    const clientes: Cliente[] = []
    for (const c of clientesData) {
      const ex = await clienteRepo.findOneBy(
        c.ruc ? { ruc: c.ruc } : { dni: (c as any).dni }
      )
      if (!ex) {
        clientes.push(await clienteRepo.save(clienteRepo.create(c)))
      } else {
        clientes.push(ex)
      }
    }
    const cMap = Object.fromEntries(
      clientes.map(c => [c.ruc || c.dni, c])
    )
    console.log(`     ✓ ${clientes.length} clientes`)

    // ── 5. TICKETS ────────────────────────────────────────────────────────────
    console.log('  → Sembrando tickets...')
    const ticketRepo  = AppDataSource.getRepository(Ticket)
    const guiaRepo    = AppDataSource.getRepository(GuiaRemision)
    const mercRepo    = AppDataSource.getRepository(MercaderiaItem)

    const ticketsData = [
      {
        numeroTicket:'301-0631143',
        fechaEmision: new Date('2026-02-11T10:05:37'),
        fechaViaje:   new Date('2026-02-11'),
        estado:       EstadoTicket.DESEMBARQUE_EN_DESTINO,
        tipoEntrega:  TipoEntrega.AGENCIA,
        tipoPago:     TipoPago.DESTINO,
        origenCod:'PIU', destinoCod:'CUS',
        remitentId:'20613042246', destinatId:'75471192',
        progCod:'PIU-CUS-0600', atencion1:'', atencion2:'',
        subTotal:2475, igv:445.5, total:2920.5, pagado:false,
        usuarioKey:'leydy.diana',
        guias: ['PIU-001234/5678'],
        mercs: [{ tipo:'CARGA GENERAL', descripcion:'REPUESTOS INDUSTRIALES', pesoTotal:150, costoKg:5.5, cantidad:3, subTotal:2475, igv:445.5, total:2920.5 }],
      },
      {
        numeroTicket:'301-0631089',
        fechaEmision: new Date('2026-02-10T14:22:10'),
        fechaViaje:   new Date('2026-02-10'),
        estado:       EstadoTicket.EN_TRANSITO,
        tipoEntrega:  TipoEntrega.REPARTO,
        tipoPago:     TipoPago.ORIGEN,
        origenCod:'LIM', destinoCod:'CUS',
        remitentId:'20512398741', destinatId:'42178956',
        progCod:'LIM-CUS-0900', atencion1:'', atencion2:'',
        subTotal:300, igv:54, total:354, pagado:true,
        usuarioKey:'maria.garcia',
        guias: ['LIM-003456/7890'],
        mercs: [{ tipo:'ENCOMIENDA', descripcion:'ROPA Y CALZADO', pesoTotal:25, costoKg:6.0, cantidad:2, subTotal:300, igv:54, total:354 }],
      },
      {
        numeroTicket:'301-0630987',
        fechaEmision: new Date('2026-02-09T09:15:00'),
        fechaViaje:   new Date('2026-02-09'),
        estado:       EstadoTicket.ENTREGADO,
        tipoEntrega:  TipoEntrega.AGENCIA,
        tipoPago:     TipoPago.DESTINO,
        origenCod:'AQP', destinoCod:'CUS',
        remitentId:'31456789', destinatId:'47812365',
        progCod:'AQP-CUS-0800', atencion1:'', atencion2:'',
        subTotal:80, igv:14.4, total:94.4, pagado:true,
        usuarioKey:'carlos.ramos',
        guias: [],
        mercs: [{ tipo:'FRÁGIL', descripcion:'VAJILLA Y CRISTALERÍA', pesoTotal:10, costoKg:8.0, cantidad:1, subTotal:80, igv:14.4, total:94.4 }],
      },
      {
        numeroTicket:'301-0631200',
        fechaEmision: new Date('2026-02-24T08:30:00'),
        fechaViaje:   new Date('2026-02-24'),
        estado:       EstadoTicket.PENDIENTE,
        tipoEntrega:  TipoEntrega.AGENCIA,
        tipoPago:     TipoPago.DESTINO,
        origenCod:'CUS', destinoCod:'QUI',
        remitentId:'20111222333', destinatId:'09876543',
        progCod:'CUS-QUI-0700', atencion1:'', atencion2:'',
        subTotal:880, igv:158.4, total:1038.4, pagado:false,
        usuarioKey:'jesus.cutisaca',
        guias: [],
        mercs: [{ tipo:'MAQUINARIA', descripcion:'HERRAMIENTAS ELÉCTRICAS', pesoTotal:80, costoKg:5.5, cantidad:2, subTotal:880, igv:158.4, total:1038.4 }],
      },
      {
        numeroTicket:'301-0631201',
        fechaEmision: new Date('2026-02-24T09:45:00'),
        fechaViaje:   new Date('2026-02-24'),
        estado:       EstadoTicket.PENDIENTE,
        tipoEntrega:  TipoEntrega.AGENCIA,
        tipoPago:     TipoPago.ORIGEN,
        origenCod:'CUS', destinoCod:'LIM',
        remitentId:'20456789012', destinatId:'48123456',
        progCod:'CUS-LIM-0800', atencion1:'FRAGIL', atencion2:'',
        subTotal:1241.5, igv:223.47, total:1464.97, pagado:true,
        usuarioKey:'leydy.diana',
        guias: ['CUS-007890/1234', 'CUS-007891/1234'],
        mercs: [
          { tipo:'TEXTILES', descripcion:'TEJIDOS ALPACA', pesoTotal:45, costoKg:5.5, cantidad:5, subTotal:1237.5, igv:222.75, total:1460.25 },
          { tipo:'DOCUMENTOS', descripcion:'CONTRATOS COMERCIALES', pesoTotal:1, costoKg:4.0, cantidad:1, subTotal:4, igv:0.72, total:4.72 },
        ],
      },
      {
        numeroTicket:'301-0631115',
        fechaEmision: new Date('2026-02-08T07:30:00'),
        fechaViaje:   new Date('2026-02-08'),
        estado:       EstadoTicket.DESEMBARQUE_EN_DESTINO,
        tipoEntrega:  TipoEntrega.REPARTO,
        tipoPago:     TipoPago.DESTINO,
        origenCod:'PUN', destinoCod:'CUS',
        remitentId:'20123456789', destinatId:'54321098',
        progCod:'PUN-CUS-0700', atencion1:'REFRIGERADO', atencion2:'',
        subTotal:11000, igv:1980, total:12980, pagado:false,
        usuarioKey:'jesus.cutisaca',
        guias: ['PUN-001122/3344'],
        mercs: [{ tipo:'ALIMENTOS', descripcion:'QUINUA ORGÁNICA', pesoTotal:200, costoKg:5.5, cantidad:10, subTotal:11000, igv:1980, total:12980 }],
      },
    ]

    for (const td of ticketsData) {
      const ex = await ticketRepo.findOneBy({ numeroTicket: td.numeroTicket })
      if (ex) continue

      const ticket = ticketRepo.create({
        numeroTicket: td.numeroTicket,
        fechaEmision: td.fechaEmision,
        fechaViaje:   td.fechaViaje,
        estado:       td.estado,
        tipoEntrega:  td.tipoEntrega,
        tipoPago:     td.tipoPago,
        origen:       destinos[td.origenCod],
        destino:      destinos[td.destinoCod],
        remitente:    cMap[td.remitentId],
        destinatario: cMap[td.destinatId],
        programacion: progs[td.progCod],
        atencion1:    td.atencion1,
        atencion2:    td.atencion2,
        subTotal:     td.subTotal,
        igv:          td.igv,
        total:        td.total,
        pagado:       td.pagado,
        fechaPago:    td.pagado ? new Date() : undefined,
        usuarioCreacion: usuarios[td.usuarioKey],
        sedeRecepcionId: usuarios[td.usuarioKey]?.sedeId,
      })
      const savedTicket = await ticketRepo.save(ticket)

      // Guías
      for (const codigo of td.guias) {
        await guiaRepo.save(guiaRepo.create({ codigo, ticketId: savedTicket.id }))
      }
      // Mercaderías
      for (const m of td.mercs) {
        await mercRepo.save(mercRepo.create({ ...m, esPesoVolumen: false, ticketId: savedTicket.id }))
      }
    }

    const totalTickets = await ticketRepo.count()
    console.log(`     ✓ ${totalTickets} tickets`)

    // ── 6. PAGOS ──────────────────────────────────────────────────────────────
    console.log('  → Sembrando pagos...')
    const pagoRepo = AppDataSource.getRepository(Pago)
    const ticketsPagados = await ticketRepo.findBy({ pagado: true })
    for (const t of ticketsPagados) {
      const ex = await pagoRepo.findOneBy({ ticketId: t.id })
      if (!ex) {
        const metodos = [MetodoPago.EFECTIVO, MetodoPago.TRANSFERENCIA, MetodoPago.YAPE]
        await pagoRepo.save(pagoRepo.create({
          ticket:     t,
          ticketId:   t.id,
          monto:      t.total,
          metodoPago: metodos[Math.floor(Math.random() * metodos.length)],
          usuario:    usuarios['leydy.diana'],
          usuarioId:  usuarios['leydy.diana'].id,
          sedeId:     usuarios['leydy.diana'].sedeId,
        }))
      }
    }
    console.log(`     ✓ pagos registrados`)

    // ── 7. DESEMBARQUES ───────────────────────────────────────────────────────
    console.log('  → Sembrando desembarques...')
    const desembRepo = AppDataSource.getRepository(Desembarque)
    const ticketsDesemb = await ticketRepo.findBy({ estado: EstadoTicket.DESEMBARQUE_EN_DESTINO })
    for (const t of ticketsDesemb) {
      const ex = await desembRepo.findOneBy({ ticketId: t.id })
      if (!ex) {
        await desembRepo.save(desembRepo.create({
          ticket:       t,
          ticketId:     t.id,
          estado:       EstadoDesembarque.PENDIENTE_VERIFICACION,
          manifiestoRef:'MAN-2026-0041',
          usuario:      usuarios['jesus.cutisaca'],
        }))
      }
    }
    console.log(`     ✓ desembarques registrados`)

    // ── 8. CONFIGURACIÓN INICIAL ─────────────────────────────────────────────
    console.log('  → Sembrando configuración...')
    const cfgRepo = AppDataSource.getRepository(Configuracion)
    const configs = [
      { clave:'sede.nombre',               valor:'GRAEL - Agencia CUSCO', tipo:'string', descripcion:'Nombre de la agencia' },
      { clave:'sede.ruc',                  valor:'20601234567',           tipo:'string', descripcion:'RUC de la empresa' },
      { clave:'sede.ciudad',               valor:'CUSCO',                 tipo:'string', descripcion:'Ciudad de la sede' },
      { clave:'sede.direccion',            valor:'Av. El Sol 123, Cusco', tipo:'string', descripcion:'Dirección de la sede' },
      { clave:'sede.telefono',             valor:'984512369',             tipo:'string', descripcion:'Teléfono principal' },
      { clave:'sede.email',                valor:'cusco@grael.pe',        tipo:'string', descripcion:'Email de la sede' },
      { clave:'tarifa.carga_general',      valor:'5.50', tipo:'number', descripcion:'Tarifa por kg - Carga General' },
      { clave:'tarifa.encomienda',         valor:'6.00', tipo:'number', descripcion:'Tarifa por kg - Encomienda' },
      { clave:'tarifa.documentos',         valor:'4.00', tipo:'number', descripcion:'Tarifa por kg - Documentos' },
      { clave:'tarifa.fragil',             valor:'8.00', tipo:'number', descripcion:'Tarifa por kg - Frágil' },
      { clave:'tarifa.perecedero',         valor:'9.00', tipo:'number', descripcion:'Tarifa por kg - Perecedero' },
      { clave:'tarifa.electrodomesticos',  valor:'7.00', tipo:'number', descripcion:'Tarifa por kg - Electrodomésticos' },
      { clave:'tarifa.textiles',           valor:'5.50', tipo:'number', descripcion:'Tarifa por kg - Textiles' },
      { clave:'tarifa.alimentos',          valor:'5.50', tipo:'number', descripcion:'Tarifa por kg - Alimentos' },
      { clave:'tarifa.maquinaria',         valor:'6.50', tipo:'number', descripcion:'Tarifa por kg - Maquinaria' },
      { clave:'sistema.igv',               valor:'18',   tipo:'number', descripcion:'% de IGV' },
      { clave:'sistema.dias_almacen',      valor:'3',    tipo:'number', descripcion:'Días máximos en almacén' },
      { clave:'sistema.tickets_por_pagina',valor:'20',   tipo:'number', descripcion:'Registros por página' },
      { clave:'detraccion.porcentaje',     valor:'4',    tipo:'number', descripcion:'% de detracción transporte' },
      { clave:'detraccion.monto_minimo',   valor:'400',  tipo:'number', descripcion:'Monto mínimo sujeto a detracción' },
    ]
    for (const c of configs) {
      const ex = await cfgRepo.findOneBy({ clave: c.clave })
      if (!ex) await cfgRepo.save(cfgRepo.create(c))
    }
    console.log(`     ✓ ${configs.length} configuraciones`)

    // ── 8.1 FLOTA Y TARIFAS V2 ───────────────────────────────────────────────
    console.log('  → Sembrando vehículos, conductores y tarifas V2...')
    const vehiculoRepo = AppDataSource.getRepository(Vehiculo)
    const conductorRepo = AppDataSource.getRepository(Conductor)
    const tarifaRepo = AppDataSource.getRepository(Tarifa)
    for (const data of [
      { placa:'ABC-123', marca:'Volvo', modelo:'FH', anio:2023, tipo:'CAMION', numeroEjes:3, capacidadKg:18000, estado:EstadoVehiculo.ACTIVO },
      { placa:'GRA-001', marca:'Mercedes-Benz', modelo:'Atego', anio:2022, tipo:'CAMION', numeroEjes:2, capacidadKg:12000, estado:EstadoVehiculo.ACTIVO },
    ]) if (!(await vehiculoRepo.findOneBy({ placa:data.placa }))) await vehiculoRepo.save(vehiculoRepo.create(data))
    for (const data of [
      { dni:'44445555', nombres:'JUAN CARLOS', apellidos:'QUISPE MAMANI', licencia:'Q12345678', categoriaLicencia:'AIIIc', empresa:'GRAEL', estado:EstadoConductor.ACTIVO },
      { dni:'46667777', nombres:'MIGUEL ANGEL', apellidos:'FLORES CONDORI', licencia:'Q87654321', categoriaLicencia:'AIIIc', empresa:'GRAEL', estado:EstadoConductor.ACTIVO },
    ]) if (!(await conductorRepo.findOneBy({ dni:data.dni }))) await conductorRepo.save(conductorRepo.create(data))
    for (const [origenCod, destinoCod] of [['CUS','LIM'], ['LIM','CUS'], ['CUS','AQP'], ['AQP','CUS']]) {
      const origen = destinos[origenCod]
      const destino = destinos[destinoCod]
      if (origen && destino && !(await tarifaRepo.findOneBy({ origenId:origen.id, destinoId:destino.id, tipoMercaderia:'CARGA GENERAL' }))) {
        await tarifaRepo.save(tarifaRepo.create({ origenId:origen.id, destinoId:destino.id, tipoMercaderia:'CARGA GENERAL', precioKg:5.5, precioMinimo:20, vigenciaDesde:new Date('2026-01-01') }))
      }
    }
    console.log('     ✓ flota y tarifas V2')

    // ── 8.2 BULTOS Y TRACKING INICIAL V2 ─────────────────────────────────────
    console.log('  → Sembrando bultos y tracking inicial...')
    const bultoRepo = AppDataSource.getRepository(Bulto)
    const trackingRepo = AppDataSource.getRepository(TrackingEvento)
    const entregaRepo = AppDataSource.getRepository(Entrega)
    const allTickets = await ticketRepo.find({ relations:['mercaderias'] })
    const sedeCusco = sedes.CUS
    for (const ticket of allTickets) {
      if ((await bultoRepo.count({ where:{ ticketId:ticket.id } })) > 0) continue
      const cantidad = Math.max(1, (ticket.mercaderias || []).reduce((sum, item) => sum + Math.min(Number(item.cantidad || 1), 10), 0))
      for (let n = 1; n <= cantidad; n++) {
        const codigo = `${ticket.numeroTicket}-${String(n).padStart(3,'0')}`
        const estado = ticket.anulado ? EstadoBulto.ANULADO : ticket.estado === EstadoTicket.ENTREGADO ? EstadoBulto.ENTREGADO : EstadoBulto.RECEPCIONADO
        const bulto = await bultoRepo.save(bultoRepo.create({ ticketId:ticket.id, codigo, numero:n, tipo:'CARGA GENERAL', cantidad:1, estado, sedeActualId:sedeCusco?.id, qrPayload:`GRAEL|BULTO|${codigo}` }))
        await trackingRepo.save(trackingRepo.create({ ticketId:ticket.id, bultoId:bulto.id, tipoEvento:TipoTrackingEvento.RECEPCIONADO, usuarioId:usuarios['leydy.diana']?.id, observacion:'Seed Demo V2' }))
        if (estado === EstadoBulto.ENTREGADO && !(await entregaRepo.findOneBy({ bultoId: bulto.id }))) {
          await entregaRepo.save(entregaRepo.create({ ticketId:ticket.id, bultoId:bulto.id, tipo:TipoEntregaV2.AGENCIA, estado:EstadoEntrega.ENTREGADA, fechaProgramada:ticket.fechaViaje, fechaEntrega:ticket.fechaEmision, nombreReceptor:ticket.destinatario?.razonSocial || 'Receptor seed V10', documentoReceptor:ticket.destinatario?.dni || ticket.destinatario?.ruc || 'SEED-V10', observacion:'POD histórico de seed V10', sedeId:sedeCusco?.id, usuarioId:usuarios['leydy.diana']?.id }))
        }
      }
    }
    console.log('     ✓ bultos y tracking inicial')

    await queryRunner.commitTransaction()

    console.log('\n✅ Seeds completados exitosamente')
    console.log('   Usuarios creados:')
    console.log('   → jesus.cutisaca / admin123  (ADMIN_SEDE)')
    console.log('   → leydy.diana    / op123     (OPERADOR)')
    console.log('   → maria.garcia   / caj123    (CAJERO)')
    console.log('   → supervisor     / super123  (SUPERVISOR)\n')

  } catch (err) {
    await queryRunner.rollbackTransaction()
    console.error('❌ Error en seeds:', err)
    throw err
  } finally {
    await queryRunner.release()
    await AppDataSource.destroy()
  }
}

runSeeds().catch(console.error)
