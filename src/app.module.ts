import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
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
import { TenantMiddleware } from './modules/ai-agent/middleware/tenant.middleware';

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
  ],
  controllers: [AppController],
  providers: [AppService, TenantMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
