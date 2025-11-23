import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Agendamento } from './agendamentos.entity';

export enum PromocaoTipo {
  CUPOM = 'CUPOM',
  GIFTCARD = 'GIFTCARD',
  CASHBACK = 'CASHBACK',
}

const DecimalTransformer = {
  to: (value?: number | null) => (value !== null && value !== undefined ? value : null),
  from: (value: string | null) => (value !== null ? parseFloat(value) : null),
};

@Entity('agendamento_promocoes')
export class AgendamentoPromocao {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Agendamento, (a) => a.promocoes, { onDelete: 'CASCADE' })
  agendamento!: Agendamento;

  @Column({ type: 'enum', enum: PromocaoTipo })
  tipo!: PromocaoTipo;

  @Column({ type: 'uuid', nullable: true })
  referenciaId?: string | null; // cupomId ou giftcardId

  @Column({ type: 'uuid', nullable: true })
  pagamentoId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  clienteId?: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: DecimalTransformer })
  valorAplicado!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  criadoEm!: Date;
}
