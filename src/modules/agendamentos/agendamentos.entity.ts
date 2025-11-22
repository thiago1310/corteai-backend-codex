import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { Profissional } from '../profissionais/profissionais.entity';
import { Usuario } from '../usuarios/usuarios.entity';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { AgendamentoServico } from './agendamento-servicos.entity';
import { AgendamentoPagamento } from './pagamentos.entity';
import { Recebimento } from './recebimento.entity';
import { ContaReceber } from './conta-receber.entity';

export enum AgendamentoStatus {
  PENDENTE = 'PENDENTE',
  CONFIRMADO = 'CONFIRMADO',
  CANCELADO = 'CANCELADO',
  EM_ATENDIMENTO = 'EM_ATENDIMENTO',
  FINALIZADO = 'FINALIZADO',
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

  @OneToMany(() => AgendamentoPagamento, (p) => p.agendamento, { cascade: true })
  pagamentos!: AgendamentoPagamento[];

  @OneToOne(() => Recebimento, (r) => r.agendamento, { cascade: true })
  recebimento?: Recebimento;

  @OneToOne(() => ContaReceber, (cr) => cr.agendamento, { cascade: true })
  contaReceber?: ContaReceber;
}
