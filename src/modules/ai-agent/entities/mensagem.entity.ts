import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'mensagens' })
export class MensagemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'cliente_id', type: 'uuid' })
  clienteId!: string;

  @Column({ name: 'conversa_id', type: 'uuid' })
  conversaId!: string;

  @Column({ type: 'varchar', length: 20 })
  papel!: string;

  @Column({ type: 'text' })
  mensagem!: string;

  @Column({ type: 'varchar', length: 30, default: 'recebida' })
  status!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadados?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamp', default: () => 'now()' })
  criadoEm!: Date;

  @UpdateDateColumn({ name: 'atualizado_em', type: 'timestamp', default: () => 'now()' })
  atualizadoEm!: Date;
}
