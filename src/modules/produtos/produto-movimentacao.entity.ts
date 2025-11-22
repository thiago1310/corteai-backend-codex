import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Produto } from './produtos.entity';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';

export enum MovimentacaoTipo {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA',
  AJUSTE = 'AJUSTE',
}

@Entity('produto_movimentacoes')
export class ProdutoMovimentacao {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Produto, { onDelete: 'CASCADE' })
  produto!: Produto;

  @ManyToOne(() => BarbeariaEntity, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @Column({ type: 'enum', enum: MovimentacaoTipo })
  tipo!: MovimentacaoTipo;

  @Column({ type: 'int' })
  quantidade!: number;

  @Column({ type: 'text', nullable: true })
  motivo?: string | null;

  @Column({ type: 'uuid', nullable: true })
  referenciaAgendamentoItem?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  criadoEm!: Date;
}
