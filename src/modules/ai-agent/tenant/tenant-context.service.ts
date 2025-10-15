import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<string>();
  private readonly defaultSchema = process.env.DEFAULT_SCHEMA || 'public';

  run(schema: string, callback: () => void): void {
    const normalized = this.normalizeSchema(schema);
    this.storage.run(normalized, callback);
  }

  getCurrentSchema(): string {
    return this.storage.getStore() || this.defaultSchema;
  }

  private normalizeSchema(schema: string): string {
    if (typeof schema !== 'string' || schema.length === 0) {
      return this.defaultSchema;
    }
    const trimmed = schema.trim().toLowerCase();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      return this.defaultSchema;
    }
    return trimmed;
  }
}
