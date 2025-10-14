import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Barbearia } from '../barbearias/barbearias.entity';

@Entity('faq')
export class Faq {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Barbearia, (b) => b.faqs, { onDelete: 'CASCADE' })
  barbearia!: Barbearia;

  @Column()
  pergunta!: string;

  @Column()
  resposta!: string;
}
