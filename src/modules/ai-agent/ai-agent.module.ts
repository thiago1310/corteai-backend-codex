import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { EmbeddingService } from './services/embedding.service';
import { RagService } from './services/rag.service';
import { DocumentEntity } from './entities/document.entity';
import { ChatHistoryEntity } from './entities/chat-history.entity';
import { ChatMessageEntity } from './entities/chat-message.entity';
import { DadosClienteEntity } from './entities/dados-cliente.entity';
import { BaseConhecimentoService } from './services/base-conhecimento.service';
import { N8nChatHistoryEntity } from './entities/n8n-chat-history.entity';
import { EvolutionApiService } from './services/evolution-api.service';
import { ConexaoEvolutionEntity } from './entities/conexao-evolution.entity';
import { ConfiguracaoAgenteEntity } from './entities/configuracao-agente.entity';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { ChatStatusEntity } from './entities/chat-status.entity';
import { ClienteEntity } from '../clientes/clientes.entity';
import { WhatsappMessageMappingEntity } from './entities/whatsapp-message-mapping.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocumentEntity,
      ChatHistoryEntity,
      ChatMessageEntity,
      DadosClienteEntity,
      ClienteEntity,
      N8nChatHistoryEntity,
      ConexaoEvolutionEntity,
      ConfiguracaoAgenteEntity,
      BarbeariaEntity,
      ChatStatusEntity,
      WhatsappMessageMappingEntity,
    ]),
  ],
  controllers: [AiAgentController],
  providers: [
    AiAgentService,
    EmbeddingService,
    RagService,
    BaseConhecimentoService,
    EvolutionApiService,
  ],
  exports: [AiAgentService],
})
export class AiAgentModule { }
