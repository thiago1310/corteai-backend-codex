import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Produto } from './produtos.entity';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { InjectEntityManager } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { EntityManager } from 'typeorm';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { UpdateProdutoDto } from './dto/update-produto.dto';

@Injectable()
export class ProdutosService {
  constructor(
    @InjectRepository(Produto) private readonly repo: Repository<Produto>,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  async findAll(barbeariaId: string) {
    return this.repo.find({
      where: { barbearia: { id: barbeariaId } },
      relations: ['barbearia'],
      order: { nome: 'ASC' },
    });
  }

  async findOne(id: string, barbeariaId: string) {
    const produto = await this.repo.findOne({
      where: { id },
      relations: ['barbearia'],
    });
    if (!produto) {
      throw new NotFoundException('Produto nao encontrado.');
    }
    if (!produto.barbearia || produto.barbearia.id !== barbeariaId) {
      throw new ForbiddenException('Este produto pertence a outra barbearia.');
    }
    return produto;
  }

  async create(barbeariaId: string, data: CreateProdutoDto) {
    const barbearia = await this.em.findOneBy(BarbeariaEntity, { id: barbeariaId });
    if (!barbearia) {
      throw new NotFoundException('Barbearia nao encontrada.');
    }

    await this.ensureNomeDisponivel(barbeariaId, data.nome);

    const entity = this.repo.create({
      nome: data.nome,
      descricao: data.descricao,
      valor: data.valor,
      barbearia,
    });
    return this.repo.save(entity);
  }

  async update(id: string, barbeariaId: string, data: UpdateProdutoDto) {
    const produto = await this.findOne(id, barbeariaId);

    if (data.nome && data.nome.toLowerCase() !== produto.nome.toLowerCase()) {
      await this.ensureNomeDisponivel(barbeariaId, data.nome, id);
    }

    this.repo.merge(produto, data);
    return this.repo.save(produto);
  }

  async remove(id: string, barbeariaId: string) {
    const produto = await this.findOne(id, barbeariaId);
    await this.repo.remove(produto);
    return { id };
  }

  private async ensureNomeDisponivel(barbeariaId: string, nome: string, ignoreId?: string) {
    const qb = this.repo
      .createQueryBuilder('produto')
      .leftJoin('produto.barbearia', 'barbearia')
      .where('barbearia.id = :barbeariaId', { barbeariaId })
      .andWhere('LOWER(produto.nome) = LOWER(:nome)', { nome });

    if (ignoreId) {
      qb.andWhere('produto.id <> :ignoreId', { ignoreId });
    }

    const count = await qb.getCount();
    if (count > 0) {
      throw new ConflictException('Ja existe um produto com este nome.');
    }
  }
}
