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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [],
      useFactory: () => {
        const databaseUrl = process.env.DATABASE_URL;
        return databaseUrl
          ? {
              type: 'postgres',
              url: databaseUrl,
              autoLoadEntities: true,
              synchronize: true,
            }
          : {
              type: 'postgres',
              host: process.env.DB_HOST || 'localhost',
              port: Number(process.env.DB_PORT || 5432),
              username: process.env.DB_USER || 'user',
              password: process.env.DB_PASS || 'pass',
              database: process.env.DB_NAME || 'barber_saas',
              entities: [
                Usuario,
                Barbearia,
                BarbeariaHorario,
                Servico,
                Profissional,
                Agendamento,
                AgendamentoServico,
                Faq,
                Lancamento,
              ],
              synchronize: true,
            };
      },
    }),
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
export class AppModule {}
