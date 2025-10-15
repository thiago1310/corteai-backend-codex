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
import { Usuario } from './modules/usuarios/usuarios.entity';
import { Barbearia } from './modules/barbearias/barbearias.entity';
import { BarbeariaHorario } from './modules/barbearias/barbearia-horarios.entity';
import { Servico } from './modules/servicos/servicos.entity';
import { Profissional } from './modules/profissionais/profissionais.entity';
import { Agendamento } from './modules/agendamentos/agendamentos.entity';
import { AgendamentoServico } from './modules/agendamentos/agendamento-servicos.entity';
import { Faq } from './modules/faq/faq.entity';
import { Lancamento } from './modules/lancamentos/lancamentos.entity';
import databaseConfig from './modules/config/database.config';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
