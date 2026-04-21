import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'configuracoes_agente' })
export class ConfiguracaoAgenteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'cliente_id', type: 'uuid', unique: true })
  clienteId!: string;

  @Column({ name: 'nome_agente', type: 'varchar', length: 150 })
  nomeAgente!: string;

  @Column({ name: 'mensagem_boas_vindas', type: 'text', nullable: true })
  mensagemBoasVindas?: string | null;

  @Column({ name: 'prompt_sistema', type: 'text' })
  promptSistema!: string;

  @Column({ name: 'tom_resposta', type: 'varchar', length: 50, nullable: true })
  tomResposta?: string | null;

  @Column({ name: 'instrucoes_extras', type: 'text', nullable: true })
  instrucoesExtras?: string | null;

  @Column({ name: 'limite_maximo_mensagens_por_conversa', type: 'int', nullable: true })
  limiteMaximoMensagensPorConversa?: number | null;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamp', default: () => 'now()' })
  criadoEm!: Date;

  @UpdateDateColumn({ name: 'atualizado_em', type: 'timestamp', default: () => 'now()' })
  atualizadoEm!: Date;
}
