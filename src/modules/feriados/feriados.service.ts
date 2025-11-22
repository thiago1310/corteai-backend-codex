import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feriado } from './feriado.entity';
import { CreateFeriadoDto } from './dto/create-feriado.dto';
import { UpdateFeriadoDto } from './dto/update-feriado.dto';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { InjectEntityManager } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { EntityManager } from 'typeorm';

@Injectable()
export class FeriadosService {
  constructor(
    @InjectRepository(Feriado) private readonly repo: Repository<Feriado>,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  async list(barbeariaId: string) {
    return this.repo.find({ where: { barbearia: { id: barbeariaId } }, order: { data: 'ASC' } });
  }

  async create(barbeariaId: string, dto: CreateFeriadoDto) {
    const barbearia = await this.em.findOneBy(BarbeariaEntity, { id: barbeariaId });
    if (!barbearia) throw new NotFoundException('Barbearia nao encontrada');
    await this.ensureDisponivel(barbeariaId, dto.data);
    const entity = this.repo.create({
      barbearia,
      data: dto.data,
      nome: dto.nome,
    });
    return this.repo.save(entity);
  }

  async update(id: string, barbeariaId: string, dto: UpdateFeriadoDto) {
    const feriado = await this.repo.findOne({ where: { id }, relations: ['barbearia'] });
    if (!feriado) throw new NotFoundException('Feriado nao encontrado');
    if (!feriado.barbearia || feriado.barbearia.id !== barbeariaId) {
      throw new ForbiddenException('Feriado pertence a outra barbearia');
    }
    if (dto.data && dto.data !== feriado.data) {
      await this.ensureDisponivel(barbeariaId, dto.data, id);
    }
    this.repo.merge(feriado, dto);
    return this.repo.save(feriado);
  }

  async remove(id: string, barbeariaId: string) {
    const feriado = await this.repo.findOne({ where: { id }, relations: ['barbearia'] });
    if (!feriado || !feriado.barbearia || feriado.barbearia.id !== barbeariaId) {
      throw new NotFoundException('Feriado nao encontrado');
    }
    await this.repo.remove(feriado);
    return { id };
  }

  private async ensureDisponivel(barbeariaId: string, data: string, ignoreId?: string) {
    const qb = this.repo
      .createQueryBuilder('f')
      .leftJoin('f.barbearia', 'b')
      .where('b.id = :barbeariaId', { barbeariaId })
      .andWhere('f.data = :data', { data });
    if (ignoreId) qb.andWhere('f.id <> :ignoreId', { ignoreId });
    const exists = await qb.getCount();
    if (exists > 0) throw new ConflictException('Já existe feriado nesta data');
  }
}
