import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';

const DecimalTransformer = {
  to: (value?: number | null) => (value !== null && value !== undefined ? value : null),
  from: (value: string | null) => (value !== null ? parseFloat(value) : null),
};

@Entity('fidelidade_config')
@Unique(['barbearia'])
export class FidelidadeConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BarbeariaEntity, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0, transformer: DecimalTransformer })
  percentualCashback!: number; // 5 = 5%

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: DecimalTransformer })
  valorMinimo!: number;

  @Column({ default: true })
  ativo!: boolean;
}
