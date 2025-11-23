import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FidelidadeConfig } from './fidelidade-config.entity';
import { CashbackSaldo } from './cashback-saldo.entity';
import { Giftcard, GiftcardStatus } from './giftcard.entity';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { InjectEntityManager } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { EntityManager } from 'typeorm';
import { randomBytes } from 'crypto';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class FidelidadeService {
  constructor(
    @InjectRepository(FidelidadeConfig) private readonly configRepo: Repository<FidelidadeConfig>,
    @InjectRepository(CashbackSaldo) private readonly saldoRepo: Repository<CashbackSaldo>,
    @InjectRepository(Giftcard) private readonly giftcardRepo: Repository<Giftcard>,
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async configurar(barbeariaId: string, percentual: number, valorMinimo: number, ativo: boolean) {
    const barbearia = await this.em.findOneBy(BarbeariaEntity, { id: barbeariaId });
    if (!barbearia) throw new NotFoundException('Barbearia não encontrada');
    let cfg = await this.configRepo.findOne({ where: { barbearia: { id: barbeariaId } } });
    if (!cfg) {
      cfg = this.configRepo.create({ barbearia });
    }
    cfg.percentualCashback = percentual;
    cfg.valorMinimo = valorMinimo;
    cfg.ativo = ativo;
    await this.configRepo.save(cfg);
    await this.audit(barbeariaId, 'FIDELIDADE_CONFIG', { percentual, valorMinimo, ativo });
    return cfg;
  }

  async creditarCashback(barbeariaId: string, clienteId: string, baseValor: number) {
    const cfg = await this.configRepo.findOne({ where: { barbearia: { id: barbeariaId } } });
    if (!cfg || !cfg.ativo || baseValor < cfg.valorMinimo || cfg.percentualCashback <= 0) {
      return null;
    }
    const credit = Number(((baseValor * cfg.percentualCashback) / 100).toFixed(2));
    let saldo = await this.saldoRepo.findOne({
      where: { barbearia: { id: barbeariaId }, clienteId },
      relations: ['barbearia'],
    });
    const barbearia =
      saldo?.barbearia ?? (await this.em.findOneBy(BarbeariaEntity, { id: barbeariaId }));
    if (!barbearia) throw new NotFoundException('Barbearia não encontrada');
    if (!saldo) {
      saldo = this.saldoRepo.create({ barbearia, clienteId, saldo: 0 });
    }
    saldo.saldo = Number((saldo.saldo + credit).toFixed(2));
    await this.saldoRepo.save(saldo);
    await this.audit(barbeariaId, 'CASHBACK_CREDITO', { clienteId, creditado: credit, saldo: saldo.saldo });
    return { creditado: credit, saldo: saldo.saldo };
  }

  async debitarCashback(barbeariaId: string, clienteId: string, valor: number) {
    const saldo = await this.saldoRepo.findOne({
      where: { barbearia: { id: barbeariaId }, clienteId },
      relations: ['barbearia'],
    });
    if (!saldo || saldo.saldo < valor) {
      throw new BadRequestException('Saldo de cashback insuficiente');
    }
    saldo.saldo = Number((saldo.saldo - valor).toFixed(2));
    await this.saldoRepo.save(saldo);
    await this.audit(barbeariaId, 'CASHBACK_DEBITO', { clienteId, debito: valor, saldo: saldo.saldo });
    return { debito: valor, saldo: saldo.saldo };
  }

  async debitarCashbackSeguro(barbeariaId: string, clienteId: string, valor: number) {
    const saldo = await this.saldoRepo.findOne({
      where: { barbearia: { id: barbeariaId }, clienteId },
      relations: ['barbearia'],
    });
    if (!saldo || saldo.saldo < valor) {
      return { debito: 0, saldo: saldo?.saldo ?? 0 };
    }
    saldo.saldo = Number((saldo.saldo - valor).toFixed(2));
    await this.saldoRepo.save(saldo);
    return { debito: valor, saldo: saldo.saldo };
  }

  async converterParaGiftcard(
    barbeariaId: string,
    clienteId: string,
    valor: number,
    expiraEm?: string,
  ) {
    await this.debitarCashback(barbeariaId, clienteId, valor);
    const barbearia = await this.em.findOneByOrFail(BarbeariaEntity, { id: barbeariaId });
    const codigo = this.gerarCodigo();
    const gift = this.giftcardRepo.create({
      barbearia,
      clienteId,
      codigo,
      valorTotal: valor,
      saldoAtual: valor,
      status: GiftcardStatus.ATIVO,
      expiraEm: expiraEm ?? null,
    });
    await this.giftcardRepo.save(gift);
    await this.audit(barbeariaId, 'GIFTCARD_EMITIDO', {
      clienteId,
      giftcardId: gift.id,
      valor,
      expiraEm: expiraEm ?? null,
    });
    return gift;
  }

  async listarGiftcards(barbeariaId: string, clienteId?: string) {
    const where: any = { barbearia: { id: barbeariaId } };
    if (clienteId) where.clienteId = clienteId;
    return this.giftcardRepo.find({ where, order: { criadoEm: 'DESC' } });
  }

  private gerarCodigo() {
    return randomBytes(6).toString('hex').toUpperCase();
  }

  async creditarValor(barbeariaId: string, clienteId: string, valor: number) {
    const barbearia = await this.em.findOneBy(BarbeariaEntity, { id: barbeariaId });
    if (!barbearia) throw new NotFoundException('Barbearia não encontrada');
    let saldo = await this.saldoRepo.findOne({
      where: { barbearia: { id: barbeariaId }, clienteId },
      relations: ['barbearia'],
    });
    if (!saldo) {
      saldo = this.saldoRepo.create({ barbearia, clienteId, saldo: 0 });
    }
    saldo.saldo = Number((saldo.saldo + valor).toFixed(2));
    await this.saldoRepo.save(saldo);
    await this.audit(barbeariaId, 'CASHBACK_CREDITO', { clienteId, creditado: valor, saldo: saldo.saldo });
    return { creditado: valor, saldo: saldo.saldo };
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
