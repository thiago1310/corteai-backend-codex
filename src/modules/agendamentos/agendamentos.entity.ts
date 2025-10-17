import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Profissional } from '../profissionais/profissionais.entity';
import { Usuario } from '../usuarios/usuarios.entity';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { AgendamentoServico } from './agendamento-servicos.entity';

export enum AgendamentoStatus {
  PENDENTE = 'PENDENTE',
  CONFIRMADO = 'CONFIRMADO',
  CANCELADO = 'CANCELADO',
  CONCLUIDO = 'CONCLUIDO',
}

@Entity('agendamentos')
export class Agendamento {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Profissional, (p) => p.agendamentos, { onDelete: 'CASCADE' })
  profissional!: Profissional;

  @ManyToOne(() => Usuario, (u) => u.agendamentos, { onDelete: 'CASCADE' })
  usuario!: Usuario;

  @ManyToOne(() => BarbeariaEntity, (b) => b.agendamentos, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @Column({ type: 'timestamptz' })
  dataInicio!: Date;

  @Column({ type: 'timestamptz' })
  dataFimPrevisto!: Date;

  @Column({ type: 'enum', enum: AgendamentoStatus, default: AgendamentoStatus.PENDENTE })
  status!: AgendamentoStatus;

  @OneToMany(() => AgendamentoServico, (as) => as.agendamento, { cascade: true })
  itens!: AgendamentoServico[];
}
