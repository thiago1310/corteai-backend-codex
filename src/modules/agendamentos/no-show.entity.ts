import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ClienteEntity } from '../clientes/clientes.entity';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';

@Entity('no_shows')
export class NoShow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ClienteEntity, { onDelete: 'CASCADE' })
  cliente!: ClienteEntity;

  @ManyToOne(() => BarbeariaEntity, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  data!: Date;
}
