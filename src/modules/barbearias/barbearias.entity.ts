import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Index,
} from 'typeorm';
import { Profissional } from '../profissionais/profissionais.entity';
import { Servico } from '../servicos/servicos.entity';
import { BarbeariaHorarioEntity } from './barbearia-horarios.entity';
import { Agendamento } from '../agendamentos/agendamentos.entity';
import { Faq } from '../faq/faq.entity';
import { Lancamento } from '../lancamentos/lancamentos.entity';

@Entity('barbearias')
export class BarbeariaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 150 })
  nome!: string;

  @Column({ length: 14 })
  cpfCnpj!: string;

  @Index({ unique: true })
  @Column({ length: 150 })
  email!: string;

  @Column()
  senha!: string;

  @Column({ length: 20, nullable: true })
  telefone?: string;

  @Column({ type: 'date', nullable: true })
  dataNascimento?: Date;

  @Column({ default: false })
  emailValidado!: boolean;

  @Column({ default: false })
  telefoneValidado!: boolean;

  @Column({ default: false })
  statusAberto!: boolean;

  @Column({ type: 'date', nullable: true })
  validadeLicenca?: Date;

  // Endereço
  @Column({ length: 9, nullable: true })
  cep?: string;
  @Column({ length: 2, nullable: true })
  uf?: string;
  @Column({ length: 100, nullable: true })
  cidade?: string;
  @Column({ length: 100, nullable: true })
  bairro?: string;
  @Column({ length: 150, nullable: true })
  rua?: string;
  @Column({ length: 20, nullable: true })
  numero?: string;

  @OneToMany(() => Profissional, (p) => p.barbearia)
  profissionais!: Profissional[];

  @OneToMany(() => Servico, (s) => s.barbearia)
  servicos!: Servico[];

  @OneToMany(() => BarbeariaHorarioEntity, (h) => h.barbearia)
  horarios!: BarbeariaHorarioEntity[];

  @OneToMany(() => Agendamento, (a) => a.barbearia)
  agendamentos!: Agendamento[];

  @OneToMany(() => Faq, (f) => f.barbearia)
  faqs!: Faq[];

  @OneToMany(() => Lancamento, (l) => l.barbearia)
  lancamentos!: Lancamento[];

  @OneToMany(() => Profissional, (p) => p.barbearia)
  funcionarios!: Profissional[];
}
