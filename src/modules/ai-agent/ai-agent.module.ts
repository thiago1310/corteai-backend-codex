import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { EmbeddingService } from './services/embedding.service';
import { RagService } from './services/rag.service';
import { DocumentEntity } from './entities/document.entity';
import { ChatHistoryEntity } from './entities/chat-history.entity';
import { TenantEntity } from './entities/tenant.entity';
import { TenantContextService } from './tenant/tenant-context.service';
import { TenantSchemaService } from './tenant/tenant-schema.service';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity, ChatHistoryEntity, TenantEntity])],
  controllers: [AiAgentController],
  providers: [AiAgentService, EmbeddingService, RagService, TenantContextService, TenantSchemaService],
  exports: [AiAgentService, TenantContextService, TenantSchemaService],
})
export class AiAgentModule {}
