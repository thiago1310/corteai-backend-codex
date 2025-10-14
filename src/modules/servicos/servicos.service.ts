import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Servico } from './servicos.entity';
import { Barbearia } from '../barbearias/barbearias.entity';
import { InjectEntityManager } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { EntityManager } from 'typeorm';

export class CreateServicoDto {
  nome!: string;
  valor!: number;
  tempoEstimado!: number;
  barbeariaId!: string;
}

@Injectable()
export class ServicosService {
  constructor(
    @InjectRepository(Servico) private readonly repo: Repository<Servico>,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  async create(data: CreateServicoDto) {
    const barbearia = await this.em.findOneByOrFail(Barbearia, {
      id: data.barbeariaId,
    });
    const entity = this.repo.create({
      nome: data.nome,
      valor: data.valor,
      tempoEstimado: data.tempoEstimado,
      barbearia,
    });
    return this.repo.save(entity);
  }

  findAll() {
    return this.repo.find({ relations: ['barbearia'] });
  }
}
