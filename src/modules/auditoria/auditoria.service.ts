import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auditoria } from './auditoria.entity';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { InjectEntityManager } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { EntityManager } from 'typeorm';

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(Auditoria) private readonly repo: Repository<Auditoria>,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  async registrar(data: CreateAuditoriaDto) {
    const barbearia = await this.em.findOneBy(BarbeariaEntity, { id: data.barbeariaId });
    if (!barbearia) throw new NotFoundException('Barbearia não encontrada');

    const entity = this.repo.create({
      barbearia,
      tipo: data.tipo,
      referenciaId: data.referenciaId ?? null,
      usuarioId: data.usuarioId ?? null,
      mensagem: data.mensagem ?? null,
      payload: data.payload ?? null,
    });
    return this.repo.save(entity);
  }

  list(barbeariaId: string, filtros?: { tipo?: string; referenciaId?: string }) {
    const qb = this.repo
      .createQueryBuilder('a')
      .leftJoin('a.barbearia', 'barbearia')
      .where('barbearia.id = :barbeariaId', { barbeariaId })
      .orderBy('a.criadoEm', 'DESC');

    if (filtros?.tipo) {
      qb.andWhere('a.tipo = :tipo', { tipo: filtros.tipo });
    }
    if (filtros?.referenciaId) {
      qb.andWhere('a.referenciaId = :referenciaId', { referenciaId: filtros.referenciaId });
    }

    return qb.getMany();
  }
}
