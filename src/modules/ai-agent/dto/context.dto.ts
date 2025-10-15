import { Expose, Transform } from 'class-transformer';

export class ContextDto {
  @Expose()
  id!: string;

  @Expose()
  content!: string;

  @Expose()
  metadata?: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => Number(value))
  similarity!: number;
}
