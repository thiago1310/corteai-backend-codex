import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { BarbeariaEntity } from './barbearias.entity';

export enum DiaSemana {
  DOMINGO = 'domingo',
  SEGUNDA = 'segunda',
  TERCA = 'terca',
  QUARTA = 'quarta',
  QUINTA = 'quinta',
  SEXTA = 'sexta',
  SABADO = 'sabado',
}

@Entity('horario_funcionamento')
@Unique(['barbearia', 'diaSemana', 'abre', 'fecha'])
export class HorarioFuncionamento {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BarbeariaEntity, (barbearia) => barbearia.horarios, {
    onDelete: 'CASCADE',
  })
  barbearia!: BarbeariaEntity;

  @Column({ type: 'enum', enum: DiaSemana })
  diaSemana!: DiaSemana;

  @Column({ type: 'char', length: 5, nullable: true })
  abre?: string | null;

  @Column({ type: 'char', length: 5, nullable: true })
  fecha?: string | null;

  @Column({ default: true })
  ativo!: boolean;
}
