import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormaPagamento } from './formas-pagamento.entity';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { InjectEntityManager } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { EntityManager } from 'typeorm';
import { CreateFormaPagamentoDto } from './dto/create-forma-pagamento.dto';
import { UpdateFormaPagamentoDto } from './dto/update-forma-pagamento.dto';

@Injectable()
export class FormasPagamentoService {
  constructor(
    @InjectRepository(FormaPagamento) private readonly repo: Repository<FormaPagamento>,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  async findAll(barbeariaId: string) {
    return this.repo.find({
      where: { barbearia: { id: barbeariaId } },
      order: { nome: 'ASC' },
    });
  }

  async findOne(id: string, barbeariaId: string) {
    const forma = await this.repo.findOne({ where: { id }, relations: ['barbearia'] });
    if (!forma) throw new NotFoundException('Forma de pagamento nao encontrada.');
    if (!forma.barbearia || forma.barbearia.id !== barbeariaId) {
      throw new ForbiddenException('Esta forma de pagamento pertence a outra barbearia.');
    }
    return forma;
  }

  async create(barbeariaId: string, data: CreateFormaPagamentoDto) {
    const barbearia = await this.em.findOneBy(BarbeariaEntity, { id: barbeariaId });
    if (!barbearia) {
      throw new NotFoundException('Barbearia nao encontrada.');
    }

    await this.ensureNomeDisponivel(barbeariaId, data.nome);

    const entity = this.repo.create({
      nome: data.nome,
      tipo: data.tipo,
      ativo: data.ativo ?? true,
      barbearia,
    });
    return this.repo.save(entity);
  }

  async update(id: string, barbeariaId: string, data: UpdateFormaPagamentoDto) {
    const forma = await this.findOne(id, barbeariaId);
    if (data.nome && data.nome.toLowerCase() !== forma.nome.toLowerCase()) {
      await this.ensureNomeDisponivel(barbeariaId, data.nome, id);
    }
    this.repo.merge(forma, data);
    return this.repo.save(forma);
  }

  async remove(id: string, barbeariaId: string) {
    const forma = await this.findOne(id, barbeariaId);
    await this.repo.remove(forma);
    return { id };
  }

  private async ensureNomeDisponivel(barbeariaId: string, nome: string, ignoreId?: string) {
    const qb = this.repo
      .createQueryBuilder('forma')
      .leftJoin('forma.barbearia', 'barbearia')
      .where('barbearia.id = :barbeariaId', { barbeariaId })
      .andWhere('LOWER(forma.nome) = LOWER(:nome)', { nome });

    if (ignoreId) {
      qb.andWhere('forma.id <> :ignoreId', { ignoreId });
    }

    const count = await qb.getCount();
    if (count > 0) {
      throw new ConflictException('Ja existe uma forma de pagamento com este nome.');
    }
  }
}
