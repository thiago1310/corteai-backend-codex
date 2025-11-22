import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';

@Entity('feriados')
@Unique(['barbearia', 'data'])
export class Feriado {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BarbeariaEntity, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @Column({ type: 'date' })
  data!: string;

  @Column({ type: 'varchar', length: 120 })
  nome!: string;
}
