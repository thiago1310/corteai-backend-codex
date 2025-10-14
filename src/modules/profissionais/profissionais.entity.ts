import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Barbearia } from '../barbearias/barbearias.entity';
import { Servico } from '../servicos/servicos.entity';
import { Agendamento } from '../agendamentos/agendamentos.entity';

@Entity('profissionais')
export class Profissional {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 150 })
  nome!: string;

  @Column({ length: 150 })
  email!: string;

  @Column({ length: 20, nullable: true })
  telefone?: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  comissao!: number; // percentual

  @ManyToOne(() => Barbearia, (b) => b.profissionais, { onDelete: 'CASCADE' })
  barbearia!: Barbearia;

  @ManyToMany(() => Servico, (s) => s.profissionais)
  @JoinTable({ name: 'profissional_servicos' })
  servicos!: Servico[];

  @OneToMany(() => Agendamento, (a) => a.profissional)
  agendamentos!: Agendamento[];
}
