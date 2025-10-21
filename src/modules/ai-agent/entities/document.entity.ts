import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'documents' })
export class DocumentEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'now()' })
  createdAt!: Date;

  @Column({ name: 'barbearia_id', type: 'uuid' })
  barbeariaId!: string;

  @Column({ name: 'question', type: 'text' })
  pergunta!: string;

  @Column({ name: 'answer', type: 'text' })
  resposta!: string;

  @Column({ name: 'status', type: 'boolean', default: true })
  ativo!: boolean;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @Column({ type: 'vector' as any })
  embedding!: number[];
}
