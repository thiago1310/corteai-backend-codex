import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'dados_cliente' })
export class DadosClienteEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'now()' })
  criadoEm!: Date;

  @Column({ name: 'barbearia_id', type: 'uuid' })
  barbeariaId!: string;

  @Column({ name: 'telefone', type: 'text', nullable: true })
  telefone?: string | null;

  @Column({ name: 'nomewpp', type: 'text', nullable: true })
  nomeWhatsApp?: string | null;

  @Column({ name: 'atendimento_ia', type: 'text', nullable: true })
  atendimentoIa?: string | null;
}
