import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { BarbeariasModule } from './modules/barbearias/barbearias.module';
import { ServicosModule } from './modules/servicos/servicos.module';
import { ProfissionaisModule } from './modules/profissionais/profissionais.module';
import { AgendamentosModule } from './modules/agendamentos/agendamentos.module';
import { FaqModule } from './modules/faq/faq.module';
import { LancamentosModule } from './modules/lancamentos/lancamentos.module';
import databaseConfig from './modules/config/database.config';
import { AiAgentModule } from './modules/ai-agent/ai-agent.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { ProdutosModule } from './modules/produtos/produtos.module';
import { FormasPagamentoModule } from './modules/formas-pagamento/formas-pagamento.module';
import { FinanceiroModule } from './modules/financeiro/financeiro.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { FidelidadeModule } from './modules/fidelidade/fidelidade.module';
import { CuponsModule } from './modules/cupons/cupons.module';
import { FeriadosModule } from './modules/feriados/feriados.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),
    AuthModule,
    UsuariosModule,
    BarbeariasModule,
    ServicosModule,
    ProfissionaisModule,
    AgendamentosModule,
    FaqModule,
    LancamentosModule,
    AiAgentModule,
    ClientesModule,
    ProdutosModule,
    FormasPagamentoModule,
    FinanceiroModule,
    AuditoriaModule,
    FidelidadeModule,
    CuponsModule,
    FeriadosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
