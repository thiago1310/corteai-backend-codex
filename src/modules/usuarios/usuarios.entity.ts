import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { Agendamento } from '../agendamentos/agendamentos.entity';

export enum UsuarioTipo {
  CLIENTE = 'CLIENTE',
  FUNCIONARIO = 'FUNCIONARIO',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 150 })
  nome!: string;

  @Column({ length: 20, nullable: true })
  telefone?: string;

  @Index({ unique: true })
  @Column({ length: 150 })
  email!: string;

  @Column({ type: 'date', nullable: true })
  dataNascimento?: Date;

  @Index({ unique: true })
  @Column({ length: 14 })
  cpf!: string;

  @Column()
  senha!: string;

  @Column({ type: 'enum', enum: UsuarioTipo, default: UsuarioTipo.CLIENTE })
  tipo!: UsuarioTipo;

  @ManyToOne(() => BarbeariaEntity, (b) => b.funcionarios, { nullable: true })
  barbearia?: BarbeariaEntity | null;

  @OneToMany(() => Agendamento, (a) => a.usuario)
  agendamentos!: Agendamento[];
}
