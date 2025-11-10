import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Servico } from './servicos.entity';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { InjectEntityManager } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { EntityManager } from 'typeorm';
import { CreateServicoDto } from './dto/create-servico.dto';
import { UpdateServicoDto } from './dto/update-servico.dto';
import { FilterServicosDto } from './dto/filter-servicos.dto';

@Injectable()
export class ServicosService {
  constructor(
    @InjectRepository(Servico) private readonly repo: Repository<Servico>,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  async create(barbeariaId: string, data: CreateServicoDto) {
    const barbearia = await this.em.findOneBy(BarbeariaEntity, {
      id: barbeariaId,
    });
    if (!barbearia) {
      throw new NotFoundException('Barbearia nao encontrada.');
    }

    await this.ensureNomeDisponivel(barbeariaId, data.nome);

    const entity = this.repo.create({
      descricao: data.descricao,
      nome: data.nome,
      valor: data.valor,
      tempoEstimado: data.tempoEstimado,
      barbearia,
    });
    return this.repo.save(entity);
  }

  async update(id: string, barbeariaId: string, data: UpdateServicoDto) {
    const servico = await this.findOwnedOrThrow(id, barbeariaId);
    if (data.nome && data.nome.toLowerCase() !== servico.nome.toLowerCase()) {
      await this.ensureNomeDisponivel(barbeariaId, data.nome, id);
    }
    this.repo.merge(servico, data);
    return this.repo.save(servico);
  }

  async remove(id: string, barbeariaId: string) {
    const servico = await this.findOwnedOrThrow(id, barbeariaId);
    await this.repo.remove(servico);
    return { id };
  }

  findAll(barbeariaId: string) {
    return this.repo.find({
      relations: ['barbearia'],
      where: { barbearia: { id: barbeariaId } },
      order: { nome: 'ASC' },
    });
  }

  search(filter: FilterServicosDto) {
    const nome = filter?.nome?.trim();
    const descricao = filter?.descricao?.trim();
    const qb = this.repo
      .createQueryBuilder('servico')
      .leftJoinAndSelect('servico.barbearia', 'barbearia')
      .where('barbearia.id = :barbeariaId', { barbeariaId: filter.barbeariaId })
      .orderBy('servico.nome', 'ASC');

    if (nome) {
      qb.andWhere('servico.nome ILIKE :nome', { nome: `%${nome}%` });
    }

    if (descricao) {
      qb.andWhere('servico.descricao ILIKE :descricao', {
        descricao: `%${descricao}%`,
      });
    }

    return qb.getMany();
  }

  private async findOwnedOrThrow(id: string, barbeariaId: string) {
    const servico = await this.repo.findOne({
      where: { id },
      relations: ['barbearia'],
    });

    if (!servico) {
      throw new NotFoundException('Servico nao encontrado.');
    }

    if (!servico.barbearia || servico.barbearia.id !== barbeariaId) {
      throw new ForbiddenException('Este servico pertence a outra barbearia.');
    }

    return servico;
  }

  private async ensureNomeDisponivel(barbeariaId: string, nome: string, ignoreId?: string) {
    const qb = this.repo
      .createQueryBuilder('servico')
      .leftJoin('servico.barbearia', 'barbearia')
      .where('barbearia.id = :barbeariaId', { barbeariaId })
      .andWhere('LOWER(servico.nome) = LOWER(:nome)', { nome });

    if (ignoreId) {
      qb.andWhere('servico.id <> :ignoreId', { ignoreId });
    }

    const count = await qb.getCount();
    if (count > 0) {
      throw new ConflictException('Ja existe um servico com este nome.');
    }
  }
}
