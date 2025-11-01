import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'whatsapp_message_mapping' })
@Index(['barbeariaId', 'stanzaId'], { unique: true })
export class WhatsappMessageMappingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'barbearia_id', type: 'uuid' })
  barbeariaId!: string;

  @Column({ name: 'stanza_id', type: 'text' })
  stanzaId!: string;

  @Column({ name: 'message_id', type: 'text', nullable: true })
  messageId!: string | null;

  @Column({ name: 'telefone', type: 'text' })
  telefone!: string;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamp', default: () => 'now()' })
  criadoEm!: Date;

  @UpdateDateColumn({ name: 'atualizado_em', type: 'timestamp', default: () => 'now()' })
  atualizadoEm!: Date;
}

