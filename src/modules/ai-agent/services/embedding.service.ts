import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { TenantSchemaService } from '../tenant/tenant-schema.service';

interface DocumentRow {
  id: string;
  content: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  constructor(private readonly tenantSchema: TenantSchemaService) {
    if (!process.env.OPENAI_API_KEY) {
      this.logger.warn('OPENAI_API_KEY is not set – embedding generation will fail.');
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const sanitized = text.trim();
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: sanitized,
      });
      return response.data[0]?.embedding || [];
    } catch (error) {
      const err = error as Error;
      this.logger.error('Failed to generate embedding', err.stack);
      throw new InternalServerErrorException('Failed to generate embedding');
    }
  }

  async storeDocument(content: string, metadata?: Record<string, unknown>): Promise<void> {
    const embedding = await this.generateEmbedding(content);
    const vectorLiteral = this.toVectorLiteral(embedding);

    await this.tenantSchema.runInTenant(async (manager) => {
      await manager.query(
        `INSERT INTO documents (content, metadata, embedding) VALUES ($1, $2, $3::vector)`,
        [content, metadata ?? null, vectorLiteral],
      );
    });
  }

  async searchDocuments(query: string, limit = 3): Promise<DocumentRow[]> {
    const embedding = await this.generateEmbedding(query);
    const vectorLiteral = this.toVectorLiteral(embedding);

    return this.tenantSchema.runInTenant(async (manager) => {
      const rows = (await manager.query(
        `SELECT md.id, md.content, md.metadata, md.similarity
         FROM match_documents($1::vector, $2) AS md(id, content, metadata, similarity)`,
        [vectorLiteral, limit],
      )) as DocumentRow[];
      return rows;
    });
  }

  private toVectorLiteral(vector: number[]): string {
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new InternalServerErrorException('Embedding vector is empty');
    }
    const formatted = vector.map((value) => (Number.isFinite(value) ? value : 0));
    return `[${formatted.join(',')}]`;
  }
}
