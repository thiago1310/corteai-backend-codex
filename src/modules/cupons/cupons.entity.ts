import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';

const DecimalTransformer = {
  to: (value?: number | null) => (value !== null && value !== undefined ? value : null),
  from: (value: string | null) => (value !== null ? parseFloat(value) : null),
};

@Entity('cupons')
@Unique(['barbearia', 'codigo'])
export class Cupom {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BarbeariaEntity, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @Column({ type: 'varchar', length: 50 })
  codigo!: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true, transformer: DecimalTransformer })
  percentual?: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: DecimalTransformer })
  valorFixo?: number | null;

  @Column({ default: true })
  ativo!: boolean;

  @Column({ type: 'date', nullable: true })
  expiraEm?: string | null;

  @Column({ type: 'int', nullable: true })
  limiteUso?: number | null;

  @Column({ type: 'int', nullable: true })
  limiteUsoPorCliente?: number | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  categoria?: string | null; // elegibilidade por categoria

  @CreateDateColumn({ type: 'timestamptz' })
  criadoEm!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  atualizadoEm!: Date;
}
