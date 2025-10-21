import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'n8n_chat_histories' })
export class N8nChatHistoryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'session_id', type: 'varchar', length: 255 })
  sessionId!: string;

  @Column({ type: 'jsonb' })
  message!: Record<string, unknown>;
}
