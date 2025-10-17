import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';

@Entity('faq')
export class Faq {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BarbeariaEntity, (b) => b.faqs, { onDelete: 'CASCADE' })
  barbearia!: BarbeariaEntity;

  @Column()
  pergunta!: string;

  @Column()
  resposta!: string;
}
