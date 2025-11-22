import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';

const DecimalTransformer = {
  to: (value?: number | null) => (value !== null && value !== undefined ? value : null),
  from: (value: string | null) => (value !== null ? parseFloat(value) : null),
};

export enum GiftcardStatus {
  ATIVO = 'ATIVO',
  USADO = 'USADO',
  EXPIRADO = 'EXPIRADO',
  CANCELADO = 'CANCELADO',
}

@Entity('giftcards')
export class Giftcard {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BarbeariaEntity, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @Column({ type: 'uuid', nullable: true })
  clienteId?: string | null;

  @Column({ type: 'varchar', length: 80, unique: true })
  codigo!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: DecimalTransformer })
  valorTotal!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: DecimalTransformer })
  saldoAtual!: number;

  @Column({ type: 'enum', enum: GiftcardStatus, default: GiftcardStatus.ATIVO })
  status!: GiftcardStatus;

  @Column({ type: 'date', nullable: true })
  expiraEm?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  criadoEm!: Date;
}
