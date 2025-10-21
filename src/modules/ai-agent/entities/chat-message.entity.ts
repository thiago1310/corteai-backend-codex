import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'chat_messages' })
export class ChatMessageEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'now()' })
  criadoEm!: Date;

  @Column({ name: 'barbearia_id', type: 'uuid' })
  barbeariaId!: string;

  @Column({ name: 'phone', type: 'text', nullable: true })
  telefone?: string | null;

  @Column({ name: 'nomewpp', type: 'text', nullable: true })
  nomeWhatsApp?: string | null;

  @Column({ name: 'bot_message', type: 'text', nullable: true })
  mensagemBot?: string | null;

  @Column({ name: 'user_message', type: 'text', nullable: true })
  mensagemUsuario?: string | null;

  @Column({ name: 'message_type', type: 'text', nullable: true })
  tipoMensagem?: string | null;
}
