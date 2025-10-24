import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'configuracoes_agente' })
export class ConfiguracaoAgenteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'barbearia_id', type: 'uuid', unique: true })
  barbeariaId!: string;

  @Column({ name: 'nome_agente', type: 'varchar', length: 150 })
  nomeAgente!: string;

  @Column({ name: 'prompt_sistema', type: 'text' })
  promptSistema!: string;

  @UpdateDateColumn({ name: 'atualizado_em', type: 'timestamp', default: () => 'now()' })
  atualizadoEm!: Date;
}
