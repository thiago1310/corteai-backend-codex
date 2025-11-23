import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';

@Entity('promocao_politicas')
@Unique(['barbearia'])
export class PromocaoPolitica {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BarbeariaEntity, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @Column({ default: false })
  permitirCupomCashback!: boolean;

  @Column({ default: false })
  permitirGiftcardCashback!: boolean;

  @Column({ type: 'int', default: 0 })
  limiteUsoPeriodoDias!: number; // 0 = sem limite por período

  @Column({ type: 'int', default: 0 })
  limiteUsoPeriodo!: number; // 0 = sem limite
}
