import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faq } from './faq.entity';
import { Barbearia } from '../barbearias/barbearias.entity';
import { InjectEntityManager } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { EntityManager } from 'typeorm';

export class CreateFaqDto {
  barbeariaId!: string;
  pergunta!: string;
  resposta!: string;
}

@Injectable()
export class FaqService {
  constructor(
    @InjectRepository(Faq) private readonly repo: Repository<Faq>,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  async create(data: CreateFaqDto) {
    const barbearia = await this.em.findOneByOrFail(Barbearia, { id: data.barbeariaId });
    const entity = this.repo.create({ barbearia, pergunta: data.pergunta, resposta: data.resposta });
    return this.repo.save(entity);
  }

  findAll() {
    return this.repo.find({ relations: ['barbearia'] });
  }
}
