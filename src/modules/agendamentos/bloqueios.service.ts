import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BloqueioAgenda } from './bloqueio.entity';
import { CreateBloqueioDto } from './dto/create-bloqueio.dto';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { Profissional } from '../profissionais/profissionais.entity';

@Injectable()
export class BloqueiosService {
  constructor(
    @InjectRepository(BloqueioAgenda) private readonly repo: Repository<BloqueioAgenda>,
    @InjectRepository(BarbeariaEntity) private readonly barbRepo: Repository<BarbeariaEntity>,
    @InjectRepository(Profissional) private readonly profRepo: Repository<Profissional>,
  ) {}

  async list(barbeariaId: string, profissionalId?: string) {
    const where: any = { barbearia: { id: barbeariaId } };
    if (profissionalId) where.profissional = { id: profissionalId };
    return this.repo.find({ where, relations: ['profissional'], order: { inicio: 'ASC' } });
  }

  async create(dto: CreateBloqueioDto) {
    const barbearia = await this.barbRepo.findOne({ where: { id: dto.barbeariaId } });
    if (!barbearia) throw new NotFoundException('Barbearia nao encontrada');
    const inicio = new Date(dto.inicio);
    const fim = new Date(dto.fim);
    if (fim <= inicio) {
      throw new BadRequestException('fim deve ser depois de inicio');
    }
    let profissional: Profissional | null = null;
    if (dto.profissionalId) {
      profissional = await this.profRepo.findOne({
        where: { id: dto.profissionalId },
        relations: ['barbearia'],
      });
      if (!profissional || !profissional.barbearia || profissional.barbearia.id !== barbearia.id) {
        throw new BadRequestException('Profissional não pertence à barbearia');
      }
    }

    // evitar sobreposição de bloqueio
    const overlap = await this.repo
      .createQueryBuilder('b')
      .where('b.barbeariaId = :barbeariaId', { barbeariaId: barbearia.id })
      .andWhere(profissional ? 'b.profissionalId = :profissionalId' : 'b.profissionalId IS NULL', {
        profissionalId: profissional?.id,
      })
      .andWhere('b.inicio < :fim AND b.fim > :inicio', { inicio, fim })
      .getOne();
    if (overlap) {
      throw new BadRequestException('Já existe bloqueio neste período');
    }

    const entity = this.repo.create({
      barbearia,
      profissional: profissional ?? null,
      inicio,
      fim,
      motivo: dto.motivo ?? null,
    });
    return this.repo.save(entity);
  }

  async remove(id: string, barbeariaId: string) {
    const bloqueio = await this.repo.findOne({ where: { id }, relations: ['barbearia'] });
    if (!bloqueio || !bloqueio.barbearia || bloqueio.barbearia.id !== barbeariaId) {
      throw new NotFoundException('Bloqueio nao encontrado');
    }
    await this.repo.remove(bloqueio);
    return { id };
  }
}
