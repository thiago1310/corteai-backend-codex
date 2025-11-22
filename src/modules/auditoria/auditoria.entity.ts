import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';

@Entity('auditorias')
export class Auditoria {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BarbeariaEntity, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @Column({ type: 'varchar', length: 120 })
  tipo!: string; // ex: COMANDA_ITEM, ESTOQUE, FINANCEIRO, PROMOCAO

  @Column({ type: 'varchar', length: 120, nullable: true })
  referenciaId?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  usuarioId?: string | null;

  @Column({ type: 'text', nullable: true })
  mensagem?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  criadoEm!: Date;
}
