import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'documentos' })
export class DocumentoEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'cliente_id', type: 'uuid' })
  clienteId!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  titulo?: string | null;

  @Column({ type: 'text' })
  pergunta!: string;

  @Column({ type: 'text' })
  resposta!: string;

  @Column({ type: 'text' })
  conteudo!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadados?: Record<string, unknown> | null;

  @Column({ type: 'vector' as any, name: 'vetor_embedding' })
  vetorEmbedding!: number[];

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  origem?: string | null;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamp', default: () => 'now()' })
  criadoEm!: Date;

  @UpdateDateColumn({ name: 'atualizado_em', type: 'timestamp', default: () => 'now()' })
  atualizadoEm!: Date;
}
