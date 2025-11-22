import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cupom } from './cupons.entity';
import { CreateCupomDto } from './dto/create-cupom.dto';
import { UpdateCupomDto } from './dto/update-cupom.dto';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { InjectEntityManager } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { EntityManager } from 'typeorm';

@Injectable()
export class CuponsService {
  constructor(
    @InjectRepository(Cupom) private readonly repo: Repository<Cupom>,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  async findAll(barbeariaId: string) {
    return this.repo.find({ where: { barbearia: { id: barbeariaId } }, order: { criadoEm: 'DESC' } });
  }

  async findOne(id: string, barbeariaId: string) {
    const cupom = await this.repo.findOne({ where: { id }, relations: ['barbearia'] });
    if (!cupom) throw new NotFoundException('Cupom não encontrado');
    if (!cupom.barbearia || cupom.barbearia.id !== barbeariaId) {
      throw new ForbiddenException('Este cupom pertence a outra barbearia.');
    }
    return cupom;
  }

  async create(barbeariaId: string, data: CreateCupomDto) {
    const barbearia = await this.em.findOneBy(BarbeariaEntity, { id: barbeariaId });
    if (!barbearia) throw new NotFoundException('Barbearia não encontrada.');
    await this.ensureCodigoDisponivel(barbeariaId, data.codigo);
    const entity = this.repo.create({
      barbearia,
      ...data,
      ativo: data.ativo ?? true,
    });
    return this.repo.save(entity);
  }

  async update(id: string, barbeariaId: string, data: UpdateCupomDto) {
    const cupom = await this.findOne(id, barbeariaId);
    if (data.codigo && data.codigo.toLowerCase() !== cupom.codigo.toLowerCase()) {
      await this.ensureCodigoDisponivel(barbeariaId, data.codigo, id);
    }
    this.repo.merge(cupom, data);
    return this.repo.save(cupom);
  }

  async remove(id: string, barbeariaId: string) {
    const cupom = await this.findOne(id, barbeariaId);
    await this.repo.remove(cupom);
    return { id };
  }

  private async ensureCodigoDisponivel(barbeariaId: string, codigo: string, ignoreId?: string) {
    const qb = this.repo
      .createQueryBuilder('c')
      .leftJoin('c.barbearia', 'barbearia')
      .where('barbearia.id = :barbeariaId', { barbeariaId })
      .andWhere('LOWER(c.codigo) = LOWER(:codigo)', { codigo });
    if (ignoreId) qb.andWhere('c.id <> :ignoreId', { ignoreId });
    const count = await qb.getCount();
    if (count > 0) throw new ConflictException('Já existe um cupom com este código.');
  }
}
