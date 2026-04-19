import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { ClienteEntity } from '../clientes/clientes.entity';
import { ConfiguracaoAgenteEntity } from './entities/configuracao-agente.entity';
import { ConversaEntity } from './entities/conversa.entity';
import { DocumentoEntity } from './entities/document.entity';
import { MensagemEntity } from './entities/mensagem.entity';
import { EmbeddingService } from './services/embedding.service';
import { DocumentosService } from './services/documentos.service';
import { LimiteRequisicoesService } from './services/limite-requisicoes.service';
import { RagService } from './services/rag.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClienteEntity,
      ConfiguracaoAgenteEntity,
      ConversaEntity,
      DocumentoEntity,
      MensagemEntity,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'seusegredoaqui',
      }),
    }),
  ],
  controllers: [AiAgentController],
  providers: [AiAgentService, EmbeddingService, DocumentosService, RagService, LimiteRequisicoesService],
  exports: [AiAgentService],
})
export class AiAgentModule {}
