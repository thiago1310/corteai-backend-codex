import {
  Column,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Agendamento } from './agendamentos.entity';

const DecimalTransformer = {
  to: (value?: number | null) => (value !== null && value !== undefined ? value : null),
  from: (value: string | null) => (value !== null ? parseFloat(value) : null),
};

export enum RecebimentoStatus {
  PENDENTE = 'PENDENTE',
  RECEBIDO = 'RECEBIDO',
  ESTORNADO = 'ESTORNADO',
}

@Entity('recebimentos')
export class Recebimento {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => Agendamento, (a) => a.recebimento, { onDelete: 'CASCADE' })
  @JoinColumn()
  agendamento!: Agendamento;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: DecimalTransformer })
  valor!: number;

  @Column({ type: 'enum', enum: RecebimentoStatus, default: RecebimentoStatus.PENDENTE })
  status!: RecebimentoStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  criadoEm!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  atualizadoEm!: Date;
}
