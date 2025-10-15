import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { TenantContextService } from './tenant-context.service';

type TenantCallback<T> = (manager: EntityManager) => Promise<T>;

@Injectable()
export class TenantSchemaService {
  private readonly logger = new Logger(TenantSchemaService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {}

  async runInTenant<T>(callback: TenantCallback<T>): Promise<T> {
    const schema = this.tenantContext.getCurrentSchema();
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    try {
      await this.ensureExtension(runner);
      await runner.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
      await runner.startTransaction();
      await runner.query(`SET LOCAL search_path TO "${schema}"`);
      await this.ensureTablesAndFunctions(runner);
      const result = await callback(runner.manager);
      await runner.commitTransaction();
      return result;
    } catch (error) {
      if (runner.isTransactionActive) {
        await runner.rollbackTransaction();
      }
      const err = error as Error;
      this.logger.error(`Tenant transaction failed for schema ${schema}`, err.stack);
      throw error;
    } finally {
      await this.resetSearchPath(runner);
      await runner.release();
    }
  }

  private async ensureExtension(runner: QueryRunner): Promise<void> {
    try {
      await runner.query('CREATE EXTENSION IF NOT EXISTS vector SCHEMA pg_catalog');
    } catch (error) {
      const err = error as Error;
      this.logger.warn('Could not create pgvector extension automatically – ensure it exists beforehand.');
      this.logger.verbose(err.message);
    }
  }

  private async ensureTablesAndFunctions(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT now(),
        content TEXT,
        metadata JSONB,
        embedding pg_catalog.vector(1536)
      )
    `);

    await runner.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT now(),
        role TEXT,
        content TEXT
      )
    `);

    await runner.query(`
      CREATE OR REPLACE FUNCTION match_documents (
        query_embedding VECTOR(1536),
        match_count INT DEFAULT 3
      )
      RETURNS TABLE (
        id BIGINT,
        content TEXT,
        metadata JSONB,
        similarity FLOAT
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT d.id,
               d.content,
               d.metadata,
               1 - (d.embedding <=> query_embedding) AS similarity
        FROM documents AS d
        ORDER BY d.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;
    `);
  }

  private async resetSearchPath(runner: QueryRunner): Promise<void> {
    try {
      await runner.query('RESET search_path');
    } catch (error) {
      this.logger.verbose(`Failed to reset search_path: ${(error as Error).message}`);
    }
  }
}
