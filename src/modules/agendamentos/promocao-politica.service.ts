import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PromocaoPolitica } from './promocao-politica.entity';
import { SetPromocaoPoliticaDto } from './dto/set-promocao-politica.dto';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { InjectEntityManager } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { EntityManager } from 'typeorm';
import { AgendamentoPromocao, PromocaoTipo } from './agendamento-promocao.entity';

@Injectable()
export class PromocaoPoliticaService {
  constructor(
    @InjectRepository(PromocaoPolitica) private readonly repo: Repository<PromocaoPolitica>,
    @InjectRepository(AgendamentoPromocao) private readonly promoRepo: Repository<AgendamentoPromocao>,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  async get(barbeariaId: string) {
    const policy = await this.repo.findOne({ where: { barbearia: { id: barbeariaId } } });
    return (
      policy ?? {
        permitirCupomCashback: false,
        permitirGiftcardCashback: false,
        limiteUsoPeriodoDias: 0,
        limiteUsoPeriodo: 0,
      }
    );
  }

  async set(barbeariaId: string, dto: SetPromocaoPoliticaDto) {
    const barbearia = await this.em.findOneBy(BarbeariaEntity, { id: barbeariaId });
    if (!barbearia) throw new NotFoundException('Barbearia não encontrada');
    let policy = await this.repo.findOne({ where: { barbearia: { id: barbeariaId } } });
    if (!policy) {
      policy = this.repo.create({ barbearia });
    }
    policy.permitirCupomCashback = dto.permitirCupomCashback ?? policy.permitirCupomCashback ?? false;
    policy.permitirGiftcardCashback =
      dto.permitirGiftcardCashback ?? policy.permitirGiftcardCashback ?? false;
    policy.limiteUsoPeriodoDias = dto.limiteUsoPeriodoDias ?? policy.limiteUsoPeriodoDias ?? 0;
    policy.limiteUsoPeriodo = dto.limiteUsoPeriodo ?? policy.limiteUsoPeriodo ?? 0;
    return this.repo.save(policy);
  }

  async validarPeriodo(barbeariaId: string, tipo: PromocaoTipo) {
    const policy = await this.get(barbeariaId);
    if (!policy.limiteUsoPeriodo || !policy.limiteUsoPeriodoDias) return;
    const agora = new Date();
    const inicio = new Date(agora.getTime() - policy.limiteUsoPeriodoDias * 24 * 60 * 60 * 1000);
    const count = await this.promoRepo.count({
      where: {
        agendamento: { barbearia: { id: barbeariaId } },
        tipo,
        criadoEm: Between(inicio, agora),
      },
    });
    if (count >= policy.limiteUsoPeriodo) {
      throw new Error('Limite de promoções no período atingido');
    }
  }
}
