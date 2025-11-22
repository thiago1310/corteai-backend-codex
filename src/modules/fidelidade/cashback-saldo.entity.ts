import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';

const DecimalTransformer = {
  to: (value?: number | null) => (value !== null && value !== undefined ? value : null),
  from: (value: string | null) => (value !== null ? parseFloat(value) : null),
};

@Entity('cashback_saldos')
@Unique(['barbearia', 'clienteId'])
export class CashbackSaldo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BarbeariaEntity, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @Column({ type: 'uuid' })
  clienteId!: string; // referencia a cliente/usuario

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: DecimalTransformer })
  saldo!: number;
}
