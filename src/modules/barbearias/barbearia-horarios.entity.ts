import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
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


@Entity('barbearia_horarios')
export class BarbeariaHorarioEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BarbeariaEntity, (b) => b.horarios, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @Column({ type: 'enum', enum: DiaSemana })
  diaSemana!: DiaSemana;

  @Column({ length: 5 })
  horaInicio!: string; // HH:mm

  @Column({ length: 5 })
  horaFim!: string; // HH:mm
}
