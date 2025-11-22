import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';

const DecimalTransformer = {
  to: (value?: number | null) => (value !== null && value !== undefined ? value : null),
  from: (value: string | null) => (value !== null ? parseFloat(value) : null),
};

export enum ContaPagarStatus {
  PENDENTE = 'PENDENTE',
  PAGO = 'PAGO',
  CANCELADO = 'CANCELADO',
}

@Entity('contas_pagar')
export class ContaPagar {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BarbeariaEntity, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @Column({ type: 'varchar', length: 150 })
  descricao!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: DecimalTransformer })
  valor!: number;

  @Column({ type: 'enum', enum: ContaPagarStatus, default: ContaPagarStatus.PENDENTE })
  status!: ContaPagarStatus;

  @Column({ type: 'date', nullable: true })
  vencimento?: string | null;

  @Column({ type: 'date', nullable: true })
  pagamentoEm?: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  categoria?: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  centroCusto?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  criadoEm!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  atualizadoEm!: Date;
}
