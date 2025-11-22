import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Agendamento } from './agendamentos.entity';
import { FormaPagamento } from '../formas-pagamento/formas-pagamento.entity';

const DecimalTransformer = {
  to: (value?: number | null) => (value !== null && value !== undefined ? value : null),
  from: (value: string | null) => (value !== null ? parseFloat(value) : null),
};

@Entity('agendamento_pagamentos')
export class AgendamentoPagamento {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Agendamento, (a) => a.pagamentos, { onDelete: 'CASCADE' })
  agendamento!: Agendamento;

  @ManyToOne(() => FormaPagamento, { onDelete: 'RESTRICT' })
  forma!: FormaPagamento;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: DecimalTransformer })
  valor!: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  dataPagamento!: Date;

  @Column({ type: 'text', nullable: true })
  observacao?: string | null;
}
