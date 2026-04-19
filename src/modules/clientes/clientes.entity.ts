import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'clientes' })
export class ClienteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  nome!: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  email!: string;

  @Column({ name: 'senha_hash', type: 'text', select: false })
  senhaHash!: string;

  @Column({ type: 'text', nullable: true })
  telefone?: string | null;

  @Column({ name: 'cpf_cnpj', type: 'text', nullable: true })
  cpfCnpj?: string | null;

  @Column({ type: 'text', default: 'ativo' })
  status!: string;

  @Column({ type: 'text', default: 'basico' })
  plano!: string;

  @CreateDateColumn({
    name: 'criado_em',
    type: 'timestamp',
    default: () => 'now()',
  })
  criadoEm!: Date;

  @UpdateDateColumn({
    name: 'atualizado_em',
    type: 'timestamp',
    default: () => 'now()',
  })
  atualizadoEm!: Date;
}
