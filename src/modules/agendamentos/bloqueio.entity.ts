import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { Profissional } from '../profissionais/profissionais.entity';

@Entity('bloqueios_agenda')
export class BloqueioAgenda {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BarbeariaEntity, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @ManyToOne(() => Profissional, { onDelete: 'CASCADE', nullable: true })
  profissional?: Profissional | null;

  @Column({ type: 'timestamptz' })
  inicio!: Date;

  @Column({ type: 'timestamptz' })
  fim!: Date;

  @Column({ type: 'text', nullable: true })
  motivo?: string | null;
}
