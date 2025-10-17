import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  OneToMany,
} from 'typeorm';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { Profissional } from '../profissionais/profissionais.entity';
import { AgendamentoServico } from '../agendamentos/agendamento-servicos.entity';

const DecimalTransformer = {
  to: (value?: number | null) => (value !== null && value !== undefined ? value : null),
  from: (value: string | null) => (value !== null ? parseFloat(value) : null),
};

@Entity('servicos')
export class Servico {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 150 })
  nome!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: DecimalTransformer })
  valor!: number;

  @Column({ type: 'int' })
  tempoEstimado!: number; // minutos

  @ManyToOne(() => BarbeariaEntity, (b) => b.servicos, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @ManyToMany(() => Profissional, (p) => p.servicos)
  profissionais!: Profissional[];

  @OneToMany(() => AgendamentoServico, (as) => as.servico)
  agendamentoServicos!: AgendamentoServico[];
}
