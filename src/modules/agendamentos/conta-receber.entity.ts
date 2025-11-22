import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Agendamento } from './agendamentos.entity';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';

const DecimalTransformer = {
  to: (value?: number | null) => (value !== null && value !== undefined ? value : null),
  from: (value: string | null) => (value !== null ? parseFloat(value) : null),
};

export enum ContaReceberStatus {
  PENDENTE = 'PENDENTE',
  PAGO = 'PAGO',
  ESTORNADO = 'ESTORNADO',
}

@Entity('contas_receber')
export class ContaReceber {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BarbeariaEntity, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @OneToOne(() => Agendamento, (a) => a.contaReceber, { onDelete: 'CASCADE' })
  @JoinColumn()
  agendamento!: Agendamento;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: DecimalTransformer })
  valor!: number;

  @Column({ type: 'enum', enum: ContaReceberStatus, default: ContaReceberStatus.PENDENTE })
  status!: ContaReceberStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  criadoEm!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  atualizadoEm!: Date;
}
