import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'chat_status' })
export class ChatStatusEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'cliente_id', type: 'text', unique: true })
  clienteId!: string;

  @Column({ type: 'int', default: 1 })
  status!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadados?: Record<string, unknown> | null;

  @UpdateDateColumn({ name: 'atualizado_em', type: 'timestamp', default: () => 'now()' })
  atualizadoEm!: Date;
}
