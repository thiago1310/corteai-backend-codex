import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lancamento, LancamentoTipo } from './lancamentos.entity';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { InjectEntityManager } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { EntityManager } from 'typeorm';

export class CreateLancamentoDto {
  descricao!: string;
  valor!: number;
  tipo!: LancamentoTipo;
  barbeariaId!: string;
  data!: Date;
}

@Injectable()
export class LancamentosService {
  constructor(
    @InjectRepository(Lancamento) private readonly repo: Repository<Lancamento>,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  async create(data: CreateLancamentoDto) {
    const barbearia = await this.em.findOneByOrFail(BarbeariaEntity, { id: data.barbeariaId });
    const entity = this.repo.create({
      descricao: data.descricao,
      valor: data.valor,
      tipo: data.tipo,
      data: new Date(data.data),
      barbearia,
    });
    return this.repo.save(entity);
  }

  findAll() {
    return this.repo.find({ relations: ['barbearia'] });
  }
}
