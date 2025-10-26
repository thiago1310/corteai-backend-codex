import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'clientes' })
@Index(['barbeariaId', 'telefone'], { unique: true })
export class ClienteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'barbearia_id', type: 'uuid' })
  barbeariaId!: string;

  @Column({ type: 'text', nullable: true })
  nome?: string | null;

  @Column({ type: 'text' })
  telefone!: string;

  @Column({ type: 'text', nullable: true })
  email?: string | null;

  @Column({ type: 'text', nullable: true })
  cpf?: string | null;



  @Column({ name: 'data_aniversario', type: 'date', nullable: true })
  dataAniversario?: Date | null;

  @CreateDateColumn({
    name: 'data_cadastro',
    type: 'timestamp',
    default: () => 'now()',
  })
  dataCadastro!: Date;

  @UpdateDateColumn({
    name: 'atualizado_em',
    type: 'timestamp',
    default: () => 'now()',
  })
  atualizadoEm!: Date;
}
