import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContaPagar } from './contas-pagar.entity';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { InjectEntityManager } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { EntityManager } from 'typeorm';
import { CreateContaPagarDto } from './dto/create-conta-pagar.dto';
import { UpdateContaPagarDto } from './dto/update-conta-pagar.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class ContasPagarService {
  constructor(
    @InjectRepository(ContaPagar) private readonly repo: Repository<ContaPagar>,
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findAll(barbeariaId: string) {
    return this.repo.find({
      where: { barbearia: { id: barbeariaId } },
      order: { vencimento: 'ASC' },
    });
  }

  async findOne(id: string, barbeariaId: string) {
    const conta = await this.repo.findOne({ where: { id }, relations: ['barbearia'] });
    if (!conta) throw new NotFoundException('Conta a pagar não encontrada.');
    if (!conta.barbearia || conta.barbearia.id !== barbeariaId) {
      throw new ForbiddenException('Esta conta pertence a outra barbearia.');
    }
    return conta;
  }

  async create(barbeariaId: string, data: CreateContaPagarDto) {
    const barbearia = await this.em.findOneBy(BarbeariaEntity, { id: barbeariaId });
    if (!barbearia) throw new NotFoundException('Barbearia não encontrada.');

    const entity = this.repo.create({
      descricao: data.descricao,
      valor: data.valor,
      status: data.status,
      vencimento: data.vencimento ?? null,
      pagamentoEm: data.pagamentoEm ?? null,
      categoria: data.categoria ?? null,
      centroCusto: data.centroCusto ?? null,
      barbearia,
    });
    const saved = await this.repo.save(entity);
    await this.audit(barbeariaId, 'CONTA_PAGAR_ADD', { id: saved.id, valor: saved.valor });
    return saved;
  }

  async update(id: string, barbeariaId: string, data: UpdateContaPagarDto) {
    const conta = await this.findOne(id, barbeariaId);
    this.repo.merge(conta, {
      ...data,
      vencimento: data.vencimento ?? conta.vencimento,
      pagamentoEm: data.pagamentoEm ?? conta.pagamentoEm,
      categoria: data.categoria ?? conta.categoria,
      centroCusto: data.centroCusto ?? conta.centroCusto,
    });
    const saved = await this.repo.save(conta);
    await this.audit(barbeariaId, 'CONTA_PAGAR_UPDATE', { id, valor: saved.valor, status: saved.status });
    return saved;
  }

  async remove(id: string, barbeariaId: string) {
    const conta = await this.findOne(id, barbeariaId);
    await this.repo.remove(conta);
    await this.audit(barbeariaId, 'CONTA_PAGAR_REMOVE', { id });
    return { id };
  }

  private async audit(barbeariaId: string, tipo: string, payload?: Record<string, unknown>) {
    try {
      await this.auditoriaService.registrar({
        barbeariaId,
        tipo,
        payload: payload ?? null,
      });
    } catch {
      /* evitar quebra */
    }
  }
}
