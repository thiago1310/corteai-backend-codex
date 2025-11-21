import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm/dist/common/typeorm.decorators';

import { Agendamento, AgendamentoStatus } from './agendamentos.entity';
import { AgendamentoServico } from './agendamento-servicos.entity';
import { Profissional } from '../profissionais/profissionais.entity';
import { Usuario } from '../usuarios/usuarios.entity';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { Servico } from '../servicos/servicos.entity';

export class CreateAgendamentoDto {
  profissionalId!: string;
  usuarioId!: string;
  barbeariaId!: string;
  dataInicio!: Date;
  dataFimPrevisto!: Date;
  status?: AgendamentoStatus;
  servicosIds?: string[];
}

@Injectable()
export class AgendamentosService {
  constructor(
    @InjectRepository(Agendamento)
    private readonly repo: Repository<Agendamento>,
    @InjectRepository(AgendamentoServico)
    private readonly itemRepo: Repository<AgendamentoServico>,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  async create(data: CreateAgendamentoDto) {
    const [profissional, usuario, barbearia] = await Promise.all([
      this.em.findOneByOrFail(Profissional, { id: data.profissionalId }),
      this.em.findOneByOrFail(Usuario, { id: data.usuarioId }),
      this.em.findOneByOrFail(BarbeariaEntity, { id: data.barbeariaId }),
    ]);

    const agendamento = this.repo.create({
      profissional,
      usuario,
      barbearia,
      dataInicio: new Date(data.dataInicio),
      dataFimPrevisto: new Date(data.dataFimPrevisto),
      status: data.status ?? AgendamentoStatus.PENDENTE,
    });

    const saved = await this.repo.save(agendamento);

    if (data.servicosIds?.length) {
      for (const servicoId of data.servicosIds) {
        const servico = await this.em.findOneBy(Servico, { id: servicoId });
        if (!servico) {
          throw new NotFoundException(`Servico ${servicoId} nao encontrado`);
        }
        await this.itemRepo.save(
          this.itemRepo.create({ agendamento: saved, servico, valor: servico.valor }),
        );
      }
    }

    return this.repo.findOne({
      where: { id: saved.id },
      relations: ['profissional', 'usuario', 'barbearia', 'itens', 'itens.servico'],
    });
  }

  findAll() {
    return this.repo.find({
      relations: ['profissional', 'usuario', 'barbearia', 'itens', 'itens.servico'],
      order: { dataInicio: 'DESC' },
    });
  }
}
