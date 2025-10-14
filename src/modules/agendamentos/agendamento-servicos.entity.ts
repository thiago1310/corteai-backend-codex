import { Entity, PrimaryGeneratedColumn, ManyToOne, Unique } from 'typeorm';
import { Agendamento } from './agendamentos.entity';
import { Servico } from '../servicos/servicos.entity';

@Entity('agendamento_servicos')
@Unique(['agendamento', 'servico'])
export class AgendamentoServico {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Agendamento, (a) => a.itens, { onDelete: 'CASCADE' })
  agendamento!: Agendamento;

  @ManyToOne(() => Servico, (s) => s.agendamentoServicos, { onDelete: 'CASCADE' })
  servico!: Servico;
}
