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

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  multaValorFixo!: number; // taxa fixa opcional

  @Column({ type: 'int', default: 0 })
  limiteNoShow!: number; // no-show permitido antes de bloquear

  @Column({ type: 'int', default: 0 })
  limiteCancelamentoSemAviso!: number; // cancelamentos tardios permitidos antes de bloquear
}
