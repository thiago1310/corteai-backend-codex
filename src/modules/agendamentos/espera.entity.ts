import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { Profissional } from '../profissionais/profissionais.entity';
import { ClienteEntity } from '../clientes/clientes.entity';

@Entity('lista_espera')
export class ListaEspera {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BarbeariaEntity, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @ManyToOne(() => Profissional, { onDelete: 'CASCADE' })
  profissional!: Profissional;

  @ManyToOne(() => ClienteEntity, { onDelete: 'SET NULL', nullable: true })
  cliente?: ClienteEntity | null;

  @Column({ type: 'text', nullable: true })
  telefone?: string | null;

  @Column({ type: 'timestamptz' })
  dataDesejada!: Date;

  @Column({ type: 'text', nullable: true })
  observacao?: string | null;

  @Column({ default: true })
  ativo!: boolean;
}
