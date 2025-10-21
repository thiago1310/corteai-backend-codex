import { Expose, Transform } from 'class-transformer';

export class ContextoDto {
  @Expose()
  id!: string;

  @Expose({ name: 'question' })
  pergunta!: string;

  @Expose({ name: 'answer' })
  resposta!: string;

  @Expose({ name: 'metadata' })
  metadados?: Record<string, unknown> | null;

  @Expose({ name: 'similarity' })
  @Transform(({ value }) => Number(value))
  similaridade!: number;
}
