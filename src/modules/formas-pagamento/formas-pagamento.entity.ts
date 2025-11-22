import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';

@Entity('formas_pagamento')
export class FormaPagamento {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  nome!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tipo?: string | null; // exemplo: dinheiro, credito, debito, pix

  @Column({ default: true })
  ativo!: boolean;

  @ManyToOne(() => BarbeariaEntity, (b) => b.formasPagamento, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;
}
