import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'whatsapp_message_mapping' })
@Index(['barbeariaId', 'placeholder'], { unique: true })
export class WhatsappMessageMappingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'barbearia_id', type: 'uuid' })
  barbeariaId!: string;

  @Column({ name: 'placeholder', type: 'text' })
  placeholder!: string;

  @Column({ name: 'telefone', type: 'text' })
  telefone!: string;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamp', default: () => 'now()' })
  criadoEm!: Date;

  @UpdateDateColumn({ name: 'atualizado_em', type: 'timestamp', default: () => 'now()' })
  atualizadoEm!: Date;
}
