import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, Unique } from 'typeorm';
import { Agendamento } from './agendamentos.entity';
import { Servico } from '../servicos/servicos.entity';

const DecimalTransformer = {
  to: (value?: number | null) => (value !== null && value !== undefined ? value : null),
  from: (value: string | null) => (value !== null ? parseFloat(value) : null),
};

@Entity('agendamento_servicos')
@Unique(['agendamento', 'servico'])
export class AgendamentoServico {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Agendamento, (a) => a.itens, { onDelete: 'CASCADE' })
  agendamento!: Agendamento;

  @ManyToOne(() => Servico, (s) => s.agendamentoServicos, { onDelete: 'CASCADE' })
  servico!: Servico;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: DecimalTransformer })
  valor!: number;
}
