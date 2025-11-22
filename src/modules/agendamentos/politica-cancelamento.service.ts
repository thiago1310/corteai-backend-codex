import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PoliticaCancelamento } from './politica-cancelamento.entity';
import { SetPoliticaCancelamentoDto } from './dto/set-politica-cancelamento.dto';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { InjectEntityManager } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { EntityManager } from 'typeorm';

@Injectable()
export class PoliticaCancelamentoService {
  constructor(
    @InjectRepository(PoliticaCancelamento) private readonly repo: Repository<PoliticaCancelamento>,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  async get(barbeariaId: string) {
    const policy = await this.repo.findOne({ where: { barbearia: { id: barbeariaId } } });
    return (
      policy ?? {
        antecedenciaMinHoras: 2,
        multaPercentual: 0,
      }
    );
  }

  async set(barbeariaId: string, dto: SetPoliticaCancelamentoDto) {
    const barbearia = await this.em.findOneBy(BarbeariaEntity, { id: barbeariaId });
    if (!barbearia) throw new NotFoundException('Barbearia não encontrada');
    let policy = await this.repo.findOne({ where: { barbearia: { id: barbeariaId } } });
    if (!policy) {
      policy = this.repo.create({ barbearia });
    }
    policy.antecedenciaMinHoras = dto.antecedenciaMinHoras;
    policy.multaPercentual = dto.multaPercentual ?? 0;
    return this.repo.save(policy);
  }

  validarAntecedencia(policy: PoliticaCancelamento | { antecedenciaMinHoras: number }, dataInicio: Date) {
    const minHoras = policy?.antecedenciaMinHoras ?? 0;
    if (minHoras <= 0) return;
    const diffMs = dataInicio.getTime() - Date.now();
    const diffHoras = diffMs / (1000 * 60 * 60);
    if (diffHoras < minHoras) {
      throw new BadRequestException(`Cancelamento não permitido: antecedência mínima ${minHoras}h`);
    }
  }
}
