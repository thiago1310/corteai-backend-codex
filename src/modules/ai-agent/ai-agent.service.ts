import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { TenantContextService } from './tenant/tenant-context.service';
import { TenantSchemaService } from './tenant/tenant-schema.service';
import { RagService } from './services/rag.service';
import { AskDto } from './dto/ask.dto';
import { TrainDto } from './dto/train.dto';
import { ContextDto } from './dto/context.dto';

interface HistoryEntry {
  id: string;
  created_at: Date;
  role: string;
  content: string;
}

@Injectable()
export class AiAgentService {
  constructor(
    private readonly ragService: RagService,
    private readonly tenantSchemaService: TenantSchemaService,
    private readonly tenantContext: TenantContextService,
  ) { }

  async ask(dto: AskDto) {
    await this.persistHistory('user', dto.question);
    const ragResponse = await this.ragService.ask(dto.question);
    await this.persistHistory('assistant', ragResponse.answer);

    const contexts = plainToInstance(ContextDto, ragResponse.contexts, {
      excludeExtraneousValues: true,
    });

    return {
      answer: ragResponse.answer,
      contexts,
    };
  }

  async train(dto: TrainDto) {
    const metadata = dto.source ? { source: dto.source } : undefined;
    await this.ragService.train(dto.documents, metadata);
    return { trained: dto.documents.length };
  }

  async getHistory(limit = 20) {
    const rows = await this.tenantSchemaService.runInTenant<HistoryEntry[]>(async (manager) => {
      return manager.query(
        `SELECT id, created_at, role, content
         FROM chat_history
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit],
      );
    });

    return rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      role: row.role,
      content: row.content,
    }));
  }

  async getActiveSchema() {
    return { schema: this.tenantContext.getCurrentSchema() };
  }

  private async persistHistory(role: 'user' | 'assistant', content: string): Promise<void> {

    await this.tenantSchemaService.runInTenant(async (manager) => {
      await manager.query(
        `INSERT INTO chat_history (role, content) VALUES ($1, $2)`,
        [role, content],
      );
    });
  }
}
