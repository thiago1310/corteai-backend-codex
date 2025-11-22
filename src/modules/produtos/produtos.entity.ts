import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';

const DecimalTransformer = {
  to: (value?: number | null) => (value !== null && value !== undefined ? value : null),
  from: (value: string | null) => (value !== null ? parseFloat(value) : null),
};

@Entity('produtos')
export class Produto {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 150 })
  nome!: string;

  @Column({ type: 'text', nullable: true })
  descricao?: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: DecimalTransformer })
  valor!: number;

  @Column({ type: 'int', default: 0 })
  estoqueAtual!: number;

  @ManyToOne(() => BarbeariaEntity, (b) => b.produtos, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;
}
