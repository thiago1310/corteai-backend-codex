import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Profissional } from './profissionais.entity';
import { DiaSemana } from '../barbearias/horario-funcionamento.entity';

@Entity('profissional_horarios')
export class ProfissionalHorario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Profissional, (profissional) => profissional.horarios, {
    onDelete: 'CASCADE',
  })
  profissional!: Profissional;

  @Column({ type: 'simple-array' })
  diasSemana!: DiaSemana[];

  @Column({ type: 'char', length: 5 })
  abre!: string;

  @Column({ type: 'char', length: 5 })
  fecha!: string;
}
