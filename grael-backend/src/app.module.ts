import { Module }           from '@nestjs/common'
import { ConfigModule }     from '@nestjs/config'
import { DatabaseModule }   from './database/database.module'
import { AuthModule }       from './auth/auth.module'
import { TicketsModule }    from './tickets/tickets.module'
import { ClientesModule }   from './clientes/clientes.module'
import { DestinosModule }   from './destinos/destinos.module'
import { MercaderiaModule } from './mercaderia/mercaderia.module'
import { TransbordoModule } from './transbordo/transbordo.module'
import { PagosModule }      from './pagos/pagos.module'
import { DesembarqueModule }     from './desembarque/desembarque.module'
import { ComprobantesModule }    from './comprobantes/comprobantes.module'
import { ManifiestoModule }      from './manifiesto/manifiesto.module'
import { ReportesModule }        from './reportes/reportes.module'
import { ProgramacionesModule }  from './programaciones/programaciones.module'
import { ConfiguracionModule }   from './configuracion/configuracion.module'
import { UsuariosModule }        from './usuarios/usuarios.module'
import { BultosModule }          from './bultos/bultos.module'
import { TrackingModule }        from './tracking/tracking.module'
import { CatalogosV2Module }     from './catalogos-v2/catalogos-v2.module'
import { IncidenciasModule }     from './incidencias/incidencias.module'
import { EntregasModule }        from './entregas/entregas.module'
import { GreModule }             from './gre/gre.module'
import { InventarioModule }       from './inventario/inventario.module'
import { EgresosModule }          from './egresos/egresos.module'
import { RepartoModule }          from './reparto/reparto.module'
import { AuditoriaModule }         from './auditoria/auditoria.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    TicketsModule,
    ClientesModule,
    DestinosModule,
    MercaderiaModule,
    TransbordoModule,
    PagosModule,
    DesembarqueModule,
    ComprobantesModule,
    ManifiestoModule,
    ReportesModule,
    ProgramacionesModule,
    ConfiguracionModule,
    UsuariosModule,
    BultosModule,
    TrackingModule,
    CatalogosV2Module,
    IncidenciasModule,
    EntregasModule,
    GreModule,
    InventarioModule,
    EgresosModule,
    RepartoModule,
    AuditoriaModule,
  ],
})
export class AppModule {}
