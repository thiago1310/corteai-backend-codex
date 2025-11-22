import { Column, Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Agendamento } from './agendamentos.entity';
import { Servico } from '../servicos/servicos.entity';
import { Produto } from '../produtos/produtos.entity';

export enum AgendamentoItemTipo {
  SERVICO = 'SERVICO',
  PRODUTO = 'PRODUTO',
}

const DecimalTransformer = {
  to: (value?: number | null) => (value !== null && value !== undefined ? value : null),
  from: (value: string | null) => (value !== null ? parseFloat(value) : null),
};

@Entity('agendamento_servicos')
export class AgendamentoServico {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Agendamento, (a) => a.itens, { onDelete: 'CASCADE' })
  agendamento!: Agendamento;

  @Column({ type: 'enum', enum: AgendamentoItemTipo, default: AgendamentoItemTipo.SERVICO })
  tipo!: AgendamentoItemTipo;

  @ManyToOne(() => Servico, (s) => s.agendamentoServicos, { onDelete: 'CASCADE', nullable: true })
  servico?: Servico | null;

  @ManyToOne(() => Produto, { onDelete: 'CASCADE', nullable: true })
  produto?: Produto | null;

  @Column({ type: 'int', default: 1 })
  quantidade!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: DecimalTransformer })
  valorUnitario!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: DecimalTransformer, nullable: true })
  descontoValor?: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: DecimalTransformer, nullable: true })
  taxaValor?: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  comissaoPercentual?: number | null;

  @Column({ type: 'text', nullable: true })
  justificativaDesconto?: string | null;

  @Column({ type: 'text', nullable: true })
  justificativaTaxa?: string | null;
}
