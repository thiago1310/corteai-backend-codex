import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type ChatRole = 'user' | 'assistant';

@Entity({ name: 'chat_history' })
export class ChatHistoryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'now()' })
  createdAt!: Date;

  @Column({ type: 'varchar', length: 20 })
  role!: ChatRole;

  @Column({ type: 'text' })
  content!: string;
}
