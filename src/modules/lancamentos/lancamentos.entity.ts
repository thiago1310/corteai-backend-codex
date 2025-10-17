import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';

export enum LancamentoTipo {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA',
}

@Entity('lancamentos')
export class Lancamento {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  descricao!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  valor!: number;

  @Column({ type: 'enum', enum: LancamentoTipo })
  tipo!: LancamentoTipo;

  @ManyToOne(() => BarbeariaEntity, (b) => b.lancamentos, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @Column({ type: 'timestamptz' })
  data!: Date;
}
