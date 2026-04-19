import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { ProfissionalHorario } from './profissional-horario.entity';

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

  @Column({ length: 255, nullable: true, select: false })
  senha?: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  comissao!: number; // percentual

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  salarioBase!: number;

  @ManyToOne(() => BarbeariaEntity, (b) => b.profissionais, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @OneToMany(() => ProfissionalHorario, (h) => h.profissional, {
    cascade: true,
  })
  horarios!: ProfissionalHorario[];
}
