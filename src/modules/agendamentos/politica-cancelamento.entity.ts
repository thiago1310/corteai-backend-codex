import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';

@Entity('politicas_cancelamento')
@Unique(['barbearia'])
export class PoliticaCancelamento {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BarbeariaEntity, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @Column({ type: 'int', default: 2 })
  antecedenciaMinHoras!: number; // horas mínimas para cancelar sem multa

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  multaPercentual!: number; // taxa percentual opcional
}
