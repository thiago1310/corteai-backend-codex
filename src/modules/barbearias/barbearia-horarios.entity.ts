import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Barbearia } from './barbearias.entity';

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
export class BarbeariaHorario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Barbearia, (b) => b.horarios, { onDelete: 'CASCADE' })
  barbearia!: Barbearia;

  @Column({ type: 'enum', enum: DiaSemana })
  diaSemana!: DiaSemana;

  @Column({ length: 5 })
  horaInicio!: string; // HH:mm

  @Column({ length: 5 })
  horaFim!: string; // HH:mm
}

