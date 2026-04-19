import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'conversas' })
export class ConversaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'cliente_id', type: 'uuid' })
  clienteId!: string;

  @Column({ name: 'dados_importantes', type: 'jsonb', nullable: true })
  dadosImportantes?: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 30, default: 'ativa' })
  status!: string;

  @Column({ type: 'varchar', length: 30, default: 'site' })
  canal!: string;

  @Column({ type: 'varchar', length: 30, default: 'widget' })
  origem!: string;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamp', default: () => 'now()' })
  criadoEm!: Date;

  @UpdateDateColumn({ name: 'atualizado_em', type: 'timestamp', default: () => 'now()' })
  atualizadoEm!: Date;
}
