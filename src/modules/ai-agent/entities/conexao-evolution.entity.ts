import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'conexoes_evolution' })
export class ConexaoEvolutionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'idbarbearia', type: 'uuid', unique: true })
  barbeariaId!: string;

  @Column({ name: 'instanceName', type: 'text' })
  instanceName!: string;

  @Column({ type: 'text', nullable: true })
  status?: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', default: () => 'now()' })
  atualizadoEm!: Date;
}
