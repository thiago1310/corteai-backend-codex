import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import { Between } from 'typeorm';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ArrayNotEmpty,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import { Agendamento, AgendamentoStatus } from './agendamentos.entity';
import { AgendamentoItemTipo, AgendamentoServico } from './agendamento-servicos.entity';
import { Profissional } from '../profissionais/profissionais.entity';
import { Usuario } from '../usuarios/usuarios.entity';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { Servico } from '../servicos/servicos.entity';
import { Produto } from '../produtos/produtos.entity';
import { EstoqueService } from '../produtos/estoque.service';
import { MovimentacaoTipo } from '../produtos/produto-movimentacao.entity';
import { AgendamentoPagamento } from './pagamentos.entity';
import { FormasPagamentoService } from '../formas-pagamento/formas-pagamento.service';
import { Recebimento, RecebimentoStatus } from './recebimento.entity';
import { ContaReceber, ContaReceberStatus } from './conta-receber.entity';
import { BloqueioAgenda } from './bloqueio.entity';
import { FidelidadeService } from '../fidelidade/fidelidade.service';
import { Feriado } from '../feriados/feriado.entity';
import { PoliticaCancelamentoService } from './politica-cancelamento.service';
import { ProfissionalHorario } from '../profissionais/profissional-horario.entity';
import { ClienteEntity } from '../clientes/clientes.entity';
import { NoShow } from './no-show.entity';
import { ListaEspera } from './espera.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { AgendamentoPromocao, PromocaoTipo } from './agendamento-promocao.entity';
import { Cupom } from '../cupons/cupons.entity';
import { Giftcard, GiftcardStatus } from '../fidelidade/giftcard.entity';
import { CashbackSaldo } from '../fidelidade/cashback-saldo.entity';

export class AgendamentoItemDto {
  @IsEnum(AgendamentoItemTipo)
  tipo!: AgendamentoItemTipo;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  servicoId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  produtoId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantidade?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  valorUnitario?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  descontoValor?: number;

  @IsOptional()
  @IsString()
  justificativaDesconto?: string | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxaValor?: number;

  @IsOptional()
  @IsString()
  justificativaTaxa?: string | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  comissaoPercentual?: number;
}

export class CreateAgendamentoDto {
  @IsString()
  @IsNotEmpty()
  profissionalId!: string;

  @IsString()
  @IsNotEmpty()
  usuarioId!: string;

  @IsString()
  @IsNotEmpty()
  barbeariaId!: string;

  @IsDateString()
  dataInicio!: string;

  @IsDateString()
  dataFimPrevisto!: string;

  @IsOptional()
  @IsEnum(AgendamentoStatus)
  status?: AgendamentoStatus;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  servicosIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AgendamentoItemDto)
  itens?: AgendamentoItemDto[];
}

export class AddItensDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AgendamentoItemDto)
  itens!: AgendamentoItemDto[];
}

export class UpdateAgendamentoStatusDto {
  @IsEnum(AgendamentoStatus)
  status!: AgendamentoStatus;
}

export class UpdateItemDto {
  @IsOptional()
  @IsEnum(AgendamentoItemTipo)
  tipo?: AgendamentoItemTipo;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  servicoId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  produtoId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantidade?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  valorUnitario?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  descontoValor?: number;

  @IsOptional()
  @IsString()
  justificativaDesconto?: string | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxaValor?: number;

  @IsOptional()
  @IsString()
  justificativaTaxa?: string | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  comissaoPercentual?: number;
}

export class AddPagamentoDto {
  @IsString()
  @IsNotEmpty()
  formaPagamentoId!: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  valor!: number;

  @IsOptional()
  @IsString()
  observacao?: string | null;

  @IsOptional()
  @IsString()
  cupomCodigo?: string | null;

  @IsOptional()
  @IsString()
  giftcardId?: string | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  cashbackValor?: number | null;
}

@Injectable()
export class AgendamentosService {
  constructor(
    @InjectRepository(Agendamento)
    private readonly repo: Repository<Agendamento>,
    @InjectRepository(AgendamentoServico)
    private readonly itemRepo: Repository<AgendamentoServico>,
    @InjectRepository(AgendamentoPagamento)
    private readonly pagamentoRepo: Repository<AgendamentoPagamento>,
    @InjectRepository(Recebimento)
    private readonly recebimentoRepo: Repository<Recebimento>,
    @InjectRepository(ContaReceber)
    private readonly contaReceberRepo: Repository<ContaReceber>,
    @InjectRepository(BloqueioAgenda)
    private readonly bloqueioRepo: Repository<BloqueioAgenda>,
    @InjectRepository(NoShow)
    private readonly noShowRepo: Repository<NoShow>,
    @InjectRepository(ListaEspera)
    private readonly esperaRepo: Repository<ListaEspera>,
    @InjectRepository(AgendamentoPromocao)
    private readonly promoRepo: Repository<AgendamentoPromocao>,
    @InjectRepository(Cupom)
    private readonly cupomRepo: Repository<Cupom>,
    @InjectRepository(Giftcard)
    private readonly giftcardRepo: Repository<Giftcard>,
    @InjectRepository(CashbackSaldo)
    private readonly cashbackRepo: Repository<CashbackSaldo>,
    @InjectRepository(Feriado)
    private readonly feriadoRepo: Repository<Feriado>,
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly estoqueService: EstoqueService,
    private readonly formasPagamentoService: FormasPagamentoService,
    private readonly fidelidadeService: FidelidadeService,
    private readonly politicaCancelamentoService: PoliticaCancelamentoService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async create(data: CreateAgendamentoDto) {
    const inicio = new Date(data.dataInicio);
    const fim = new Date(data.dataFimPrevisto);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
      throw new BadRequestException('Datas inválidas');
    }
    if (fim <= inicio) {
      throw new BadRequestException('dataFimPrevisto deve ser após dataInicio');
    }

    const [profissional, usuario, barbearia] = await Promise.all([
      this.em.findOneByOrFail(Profissional, { id: data.profissionalId }),
      this.em.findOneByOrFail(Usuario, { id: data.usuarioId }),
      this.em.findOneByOrFail(BarbeariaEntity, { id: data.barbeariaId }),
    ]);

    if (profissional.barbearia.id !== barbearia.id) {
      throw new BadRequestException('Profissional não pertence a barbearia informada');
    }
    if (usuario.barbearia && usuario.barbearia.id !== barbearia.id) {
      throw new BadRequestException('Usuário não pertence a barbearia informada');
    }

    await this.ensureAvailability(profissional.id, barbearia.id, inicio, fim);

    const agendamento = this.repo.create({
      profissional,
      usuario,
      barbearia,
      dataInicio: inicio,
      dataFimPrevisto: fim,
      status: data.status ?? AgendamentoStatus.PENDENTE,
    });

    const saved = await this.repo.save(agendamento);

    const itensInput =
      data.itens && data.itens.length
        ? data.itens
        : data.servicosIds?.map((id) => ({
            tipo: AgendamentoItemTipo.SERVICO,
            servicoId: id,
            quantidade: 1,
          }));

    if (itensInput?.length) {
      for (const item of itensInput) {
        const entity = await this.mapItemInput({
          input: item,
          agendamento: saved,
          barbeariaId: barbearia.id,
          comissaoDefault: profissional.comissao,
        });
        await this.itemRepo.save(entity);
        await this.registrarMovimentacaoProduto(entity, MovimentacaoTipo.SAIDA);
        await this.audit('COMANDA_ITEM_ADD', barbearia.id, agendamento.usuario?.id, {
          agendamentoId: saved.id,
          itemId: entity.id,
          tipo: entity.tipo,
          servicoId: entity.servico?.id,
          produtoId: entity.produto?.id,
        });
      }
    }

    return this.repo.findOne({
      where: { id: saved.id },
      relations: ['profissional', 'usuario', 'barbearia', 'itens', 'itens.servico', 'itens.produto'],
    });
  }

  findAll() {
    return this.repo.find({
      relations: ['profissional', 'usuario', 'barbearia', 'itens', 'itens.servico', 'itens.produto'],
      order: { dataInicio: 'DESC' },
    });
  }

  async getDisponibilidade(
    profissionalId: string,
    barbeariaId: string,
    data: Date,
    intervaloMinutos = 60,
    servicoId?: string,
  ) {
    const profissional = await this.em.findOne(Profissional, {
      where: { id: profissionalId },
      relations: ['barbearia', 'horarios'],
    });
    if (!profissional || profissional.barbearia.id !== barbeariaId) {
      throw new NotFoundException('Profissional nao encontrado na barbearia');
    }

    const dataIso = data.toISOString().slice(0, 10);
    const feriado = await this.feriadoRepo.findOne({
      where: { barbearia: { id: barbeariaId }, data: dataIso },
    });
    if (feriado) {
      return { data: dataIso, slots: [] };
    }

    const bloqueios = await this.bloqueioRepo
      .createQueryBuilder('b')
      .where('b.inicio::date = :data', { data: dataIso })
      .andWhere('(b.profissionalId = :profissionalId OR b.profissionalId IS NULL)', { profissionalId })
      .getMany();

    const inicioDia = new Date(`${dataIso}T00:00:00Z`);
    const fimDia = new Date(`${dataIso}T23:59:59Z`);
    const agendamentos = await this.repo.find({
      where: {
        profissional: { id: profissionalId },
        dataInicio: Between(inicioDia, fimDia),
      },
    });

    const activeStatuses = [
      AgendamentoStatus.PENDENTE,
      AgendamentoStatus.CONFIRMADO,
      AgendamentoStatus.EM_ATENDIMENTO,
      AgendamentoStatus.FINALIZADO,
    ];
    const ocupados = agendamentos
      .filter((ag) => activeStatuses.includes(ag.status))
      .map((ag) => ({ inicio: ag.dataInicio, fim: ag.dataFimPrevisto }));

    const diaJs = data.getDay();
    const horariosDia = (profissional.horarios ?? []).filter((h) =>
      h.diasSemana.includes(this.mapDiaSemana(diaJs)),
    );
    const slots: { inicio: Date; fim: Date }[] = [];

    let intervalo = intervaloMinutos;
    if (servicoId) {
      const servico = await this.em.findOne(Servico, {
        where: { id: servicoId, barbearia: { id: barbeariaId } },
      });
      if (servico?.tempoEstimado) {
        intervalo = servico.tempoEstimado;
      }
    }

    horariosDia.forEach((h) => {
      const inicio = new Date(`${dataIso}T${h.abre}:00Z`);
      const fim = new Date(`${dataIso}T${h.fecha}:00Z`);
      let cursor = inicio;
      while (cursor < fim) {
        const prox = new Date(cursor.getTime() + intervalo * 60000);
        if (prox > fim) break;
        const slot = { inicio: cursor, fim: prox };
        if (!this.overlap(slot, bloqueios) && !this.overlap(slot, ocupados)) {
          slots.push(slot);
        }
        cursor = prox;
      }
    });

    return {
      data: dataIso,
      intervaloMinutos: intervalo,
      servicoId: servicoId ?? null,
      slots,
    };
  }

  async addItens(agendamentoId: string, dto: AddItensDto) {
    const agendamento = await this.repo.findOne({
      where: { id: agendamentoId },
      relations: ['barbearia', 'profissional'],
    });
    if (!agendamento) {
      throw new NotFoundException('Agendamento nao encontrado');
    }

    for (const item of dto.itens) {
      const entity = await this.mapItemInput({
        input: item,
        agendamento,
        barbeariaId: agendamento.barbearia.id,
        comissaoDefault: agendamento.profissional.comissao,
      });
      await this.itemRepo.save(entity);
      await this.registrarMovimentacaoProduto(entity, MovimentacaoTipo.SAIDA);
      await this.audit('COMANDA_ITEM_ADD', agendamento.barbearia.id, agendamento.usuario?.id, {
        agendamentoId: agendamento.id,
        itemId: entity.id,
        tipo: entity.tipo,
        servicoId: entity.servico?.id,
        produtoId: entity.produto?.id,
      });
    }

    return this.repo.findOne({
      where: { id: agendamento.id },
      relations: ['profissional', 'usuario', 'barbearia', 'itens', 'itens.servico', 'itens.produto'],
    });
  }

  async updateItem(agendamentoId: string, itemId: string, dto: UpdateItemDto) {
    const agendamento = await this.repo.findOne({
      where: { id: agendamentoId },
      relations: ['barbearia', 'profissional'],
    });
    if (!agendamento) {
      throw new NotFoundException('Agendamento nao encontrado');
    }

    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['agendamento', 'servico', 'servico.barbearia', 'produto', 'produto.barbearia'],
    });
    if (!item || item.agendamento.id !== agendamentoId) {
      throw new NotFoundException('Item nao encontrado neste agendamento');
    }

    const tipo = dto.tipo ?? item.tipo;
    const quantidade = dto.quantidade && dto.quantidade > 0 ? dto.quantidade : item.quantidade;
    const produtoAntes = item.tipo === AgendamentoItemTipo.PRODUTO ? item.produto : null;
    const qtdAntes = item.tipo === AgendamentoItemTipo.PRODUTO ? item.quantidade : 0;

    if (tipo === AgendamentoItemTipo.SERVICO) {
      const servicoId = dto.servicoId ?? item.servico?.id;
      if (!servicoId) {
        throw new BadRequestException('servicoId é obrigatório para itens de serviço');
      }
      const servico = await this.em.findOne(Servico, {
        where: { id: servicoId },
        relations: ['barbearia'],
      });
      if (!servico) {
        throw new NotFoundException(`Servico ${servicoId} nao encontrado`);
      }
      if (!servico.barbearia || servico.barbearia.id !== agendamento.barbearia.id) {
        throw new BadRequestException('Servico não pertence à barbearia do agendamento');
      }
      item.tipo = AgendamentoItemTipo.SERVICO;
      item.servico = servico;
      item.produto = null;
      item.valorUnitario = dto.valorUnitario ?? item.valorUnitario ?? servico.valor;
    } else if (tipo === AgendamentoItemTipo.PRODUTO) {
      const produtoId = dto.produtoId ?? item.produto?.id;
      if (!produtoId) {
        throw new BadRequestException('produtoId é obrigatório para itens de produto');
      }
      const produto = await this.em.findOne(Produto, {
        where: { id: produtoId },
        relations: ['barbearia'],
      });
      if (!produto) {
        throw new NotFoundException(`Produto ${produtoId} nao encontrado`);
      }
      if (!produto.barbearia || produto.barbearia.id !== agendamento.barbearia.id) {
        throw new BadRequestException('Produto não pertence à barbearia do agendamento');
      }
      item.tipo = AgendamentoItemTipo.PRODUTO;
      item.produto = produto;
      item.servico = null;
      item.valorUnitario = dto.valorUnitario ?? item.valorUnitario ?? produto.valor;
    } else {
      throw new BadRequestException('Tipo de item inválido');
    }

    item.quantidade = quantidade;
    item.descontoValor = dto.descontoValor ?? item.descontoValor ?? null;
    item.taxaValor = dto.taxaValor ?? item.taxaValor ?? null;
    item.justificativaDesconto = dto.justificativaDesconto ?? item.justificativaDesconto ?? null;
    item.justificativaTaxa = dto.justificativaTaxa ?? item.justificativaTaxa ?? null;
    item.comissaoPercentual =
      dto.comissaoPercentual ?? item.comissaoPercentual ?? agendamento.profissional.comissao ?? null;

    await this.itemRepo.save(item);

    if (produtoAntes) {
      await this.registrarMovimentacaoProduto(
        { ...item, produto: produtoAntes, quantidade: qtdAntes, tipo: AgendamentoItemTipo.PRODUTO },
        MovimentacaoTipo.ENTRADA,
      );
    }
    if (item.tipo === AgendamentoItemTipo.PRODUTO && item.produto) {
      await this.registrarMovimentacaoProduto(item, MovimentacaoTipo.SAIDA);
    }
    await this.audit('COMANDA_ITEM_UPDATE', agendamento.barbearia.id, agendamento.usuario?.id, {
      agendamentoId: agendamento.id,
      itemId: item.id,
      tipo: item.tipo,
      servicoId: item.servico?.id,
      produtoId: item.produto?.id,
    });

    return this.repo.findOne({
      where: { id: agendamento.id },
      relations: ['profissional', 'usuario', 'barbearia', 'itens', 'itens.servico', 'itens.produto'],
    });
  }

  async removeItem(agendamentoId: string, itemId: string) {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: ['agendamento', 'produto', 'produto.barbearia'],
    });
    if (!item || item.agendamento.id !== agendamentoId) {
      throw new NotFoundException('Item nao encontrado neste agendamento');
    }
    await this.itemRepo.remove(item);
    if (item.tipo === AgendamentoItemTipo.PRODUTO && item.produto) {
      await this.registrarMovimentacaoProduto(item, MovimentacaoTipo.ENTRADA);
    }
    await this.audit('COMANDA_ITEM_REMOVE', item.agendamento.barbearia.id, item.agendamento.usuario?.id, {
      agendamentoId: agendamentoId,
      itemId: itemId,
      tipo: item.tipo,
      servicoId: item.servico?.id,
      produtoId: item.produto?.id,
    });
    return { id: itemId };
  }

  async updateStatus(id: string, status: AgendamentoStatus) {
    const agendamento = await this.repo.findOne({
      where: { id },
      relations: [
        'itens',
        'itens.produto',
        'itens.produto.barbearia',
        'barbearia',
        'pagamentos',
        'usuario',
      ],
    });
    if (!agendamento) {
      throw new NotFoundException('Agendamento nao encontrado');
    }
    this.assertStatusTransition(agendamento.status, status);

    const fromStatus = agendamento.status;
    agendamento.status = status;
    await this.repo.save(agendamento);

    // Se cancelar, devolve estoque de itens de produto
    if (status === AgendamentoStatus.CANCELADO && fromStatus !== AgendamentoStatus.CANCELADO) {
      // valida política de cancelamento (antecedência) se ainda não iniciou
      if (agendamento.dataInicio > new Date()) {
        const policy = await this.politicaCancelamentoService.get(agendamento.barbearia.id);
        this.politicaCancelamentoService.validarAntecedencia(policy as any, agendamento.dataInicio);
      }
      for (const item of agendamento.itens ?? []) {
        if (item.tipo === AgendamentoItemTipo.PRODUTO && item.produto) {
          await this.registrarMovimentacaoProduto(item, MovimentacaoTipo.ENTRADA);
        }
      }
      await this.estornarRecebimento(agendamento.id);
      await this.estornarContaReceber(agendamento.id);
      await this.estornarCashbackSeNecessario(agendamento);
      return agendamento;
    }

    if (status === AgendamentoStatus.FINALIZADO) {
      const resumo = await this.atualizarRecebimento(agendamento.id);
      await this.atualizarContaReceber(agendamento.id);
      // Crédito de cashback se total recebido e houver cliente
      if (
        resumo?.status === RecebimentoStatus.RECEBIDO &&
        agendamento.usuario?.id &&
        agendamento.barbearia?.id
      ) {
        await this.fidelidadeService.creditarCashback(
          agendamento.barbearia.id,
          agendamento.usuario.id,
          resumo.total,
        );
      }
    }

    return agendamento;
  }

  async addPagamento(agendamentoId: string, dto: AddPagamentoDto) {
    const agendamento = await this.repo.findOne({
      where: { id: agendamentoId },
      relations: ['barbearia', 'usuario'],
    });
    if (!agendamento) throw new NotFoundException('Agendamento nao encontrado');

    const forma = await this.formasPagamentoService.findOne(dto.formaPagamentoId, agendamento.barbearia.id);

    const promoResultado = await this.aplicarPromocaoSeSolicitada(agendamento, dto);

    const pagamento = this.pagamentoRepo.create({
      agendamento,
      forma,
      valor: dto.valor,
      observacao: dto.observacao ?? null,
    });
    await this.pagamentoRepo.save(pagamento);

    if (promoResultado?.promocao) {
      promoResultado.promocao.pagamentoId = pagamento.id;
      await this.promoRepo.save(promoResultado.promocao);
    }

    await this.atualizarRecebimento(agendamentoId);
    await this.atualizarContaReceber(agendamentoId);
    await this.audit('PAGAMENTO_ADD', agendamento.barbearia.id, agendamento.usuario?.id, {
      agendamentoId,
      pagamentoId: pagamento.id,
      formaPagamentoId: dto.formaPagamentoId,
      valor: dto.valor,
      promocao: promoResultado?.detalhe ?? null,
    });

    return this.pagamentoRepo.find({
      where: { agendamento: { id: agendamentoId } },
      relations: ['forma'],
      order: { dataPagamento: 'DESC' },
    });
  }

  private async ensureAvailability(
    profissionalId: string,
    barbeariaId: string,
    dataInicio: Date,
    dataFimPrevisto: Date,
  ) {
    const activeStatuses = [
      AgendamentoStatus.PENDENTE,
      AgendamentoStatus.CONFIRMADO,
      AgendamentoStatus.EM_ATENDIMENTO,
    ];

    const overlap = await this.repo
      .createQueryBuilder('ag')
      .where('ag.profissionalId = :profissionalId', { profissionalId })
      .andWhere('ag.status IN (:...statuses)', { statuses: activeStatuses })
      .andWhere('ag.dataInicio < :dataFimPrevisto AND ag.dataFimPrevisto > :dataInicio', {
        dataInicio,
        dataFimPrevisto,
      })
      .getOne();

    if (overlap) {
      throw new BadRequestException('Profissional já possui agendamento neste horário');
    }

    const bloqueio = await this.bloqueioRepo
      .createQueryBuilder('b')
      .where('b.inicio < :fim AND b.fim > :inicio', { inicio: dataInicio, fim: dataFimPrevisto })
      .andWhere('(b.profissionalId = :profissionalId OR b.profissionalId IS NULL)', { profissionalId })
      .andWhere('b.barbeariaId = :barbeariaId', { barbeariaId })
      .getOne();
    if (bloqueio) {
      throw new BadRequestException('Horário bloqueado para agendamento');
    }

    const feriado = await this.feriadoRepo.findOne({
      where: { barbearia: { id: barbeariaId }, data: dataInicio.toISOString().slice(0, 10) },
    });
    if (feriado) {
      throw new BadRequestException('Data está em feriado da barbearia');
    }
  }

  private assertStatusTransition(atual: AgendamentoStatus, novo: AgendamentoStatus) {
    if (atual === AgendamentoStatus.FINALIZADO || atual === AgendamentoStatus.CANCELADO) {
      throw new BadRequestException('Não é possível alterar status após finalizado/cancelado');
    }
    const allowed = new Map<AgendamentoStatus, AgendamentoStatus[]>([
      [AgendamentoStatus.PENDENTE, [AgendamentoStatus.CONFIRMADO, AgendamentoStatus.CANCELADO]],
      [
        AgendamentoStatus.CONFIRMADO,
        [AgendamentoStatus.EM_ATENDIMENTO, AgendamentoStatus.CANCELADO],
      ],
      [
        AgendamentoStatus.EM_ATENDIMENTO,
        [AgendamentoStatus.FINALIZADO, AgendamentoStatus.CANCELADO],
      ],
    ]);

    const possiveis = allowed.get(atual) ?? [];
    if (!possiveis.includes(novo)) {
      throw new BadRequestException(`Transição de ${atual} para ${novo} não permitida`);
    }
  }

  private async mapItemInput(params: {
    input: AgendamentoItemDto;
    agendamento: Agendamento;
    barbeariaId: string;
    comissaoDefault: number;
  }) {
    const { input, agendamento, barbeariaId, comissaoDefault } = params;
    const quantidade = input.quantidade && input.quantidade > 0 ? input.quantidade : 1;

    if (input.tipo === AgendamentoItemTipo.SERVICO) {
      if (!input.servicoId) {
        throw new BadRequestException('servicoId é obrigatório para itens de serviço');
      }
      const servico = await this.em.findOne(Servico, {
        where: { id: input.servicoId },
        relations: ['barbearia'],
      });
      if (!servico) {
        throw new NotFoundException(`Servico ${input.servicoId} nao encontrado`);
      }
      if (!servico.barbearia || servico.barbearia.id !== barbeariaId) {
        throw new BadRequestException('Servico não pertence à barbearia do agendamento');
      }
      const valorUnitario = input.valorUnitario ?? servico.valor;
      return this.itemRepo.create({
        agendamento,
        tipo: AgendamentoItemTipo.SERVICO,
        servico,
        quantidade,
        valorUnitario,
        descontoValor: input.descontoValor ?? null,
        taxaValor: input.taxaValor ?? null,
        comissaoPercentual: input.comissaoPercentual ?? comissaoDefault ?? null,
        justificativaDesconto: input.justificativaDesconto ?? null,
        justificativaTaxa: input.justificativaTaxa ?? null,
      });
    }

    if (input.tipo === AgendamentoItemTipo.PRODUTO) {
      if (!input.produtoId) {
        throw new BadRequestException('produtoId é obrigatório para itens de produto');
      }
      const produto = await this.em.findOne(Produto, {
        where: { id: input.produtoId },
        relations: ['barbearia'],
      });
      if (!produto) {
        throw new NotFoundException(`Produto ${input.produtoId} nao encontrado`);
      }
      if (!produto.barbearia || produto.barbearia.id !== barbeariaId) {
        throw new BadRequestException('Produto não pertence à barbearia do agendamento');
      }
      const valorUnitario = input.valorUnitario ?? produto.valor;
      return this.itemRepo.create({
        agendamento,
        tipo: AgendamentoItemTipo.PRODUTO,
        produto,
        quantidade,
        valorUnitario,
        descontoValor: input.descontoValor ?? null,
        taxaValor: input.taxaValor ?? null,
        comissaoPercentual: input.comissaoPercentual ?? comissaoDefault ?? null,
        justificativaDesconto: input.justificativaDesconto ?? null,
        justificativaTaxa: input.justificativaTaxa ?? null,
      });
    }

    throw new BadRequestException('Tipo de item inválido');
  }

  private async registrarMovimentacaoProduto(
    item: AgendamentoServico,
    tipoMov: MovimentacaoTipo,
  ): Promise<void> {
    if (item.tipo !== AgendamentoItemTipo.PRODUTO || !item.produto) return;
    await this.estoqueService.movimentar(item.produto.barbearia.id, {
      produtoId: item.produto.id,
      tipo: tipoMov,
      quantidade: item.quantidade,
      motivo: 'Movimentação por comanda',
      referenciaAgendamentoItem: item.id,
    });
    await this.audit('ESTOQUE_MOV', item.produto.barbearia.id, null, {
      produtoId: item.produto.id,
      tipoMov,
      quantidade: item.quantidade,
      agendamentoItemId: item.id,
    });
  }

  private async atualizarRecebimento(agendamentoId: string) {
    const agendamento = await this.repo.findOne({
      where: { id: agendamentoId },
      relations: ['itens', 'pagamentos'],
    });
    if (!agendamento) {
      throw new NotFoundException('Agendamento nao encontrado');
    }
    const total = this.calcularTotalItens(agendamento);
    const pagos = (agendamento.pagamentos ?? []).reduce((acc, p) => acc + Number(p.valor ?? 0), 0);
    const status =
      pagos >= total && total > 0 ? RecebimentoStatus.RECEBIDO : RecebimentoStatus.PENDENTE;

    let recebimento = await this.recebimentoRepo.findOne({
      where: { agendamento: { id: agendamentoId } },
    });
    if (!recebimento) {
      recebimento = this.recebimentoRepo.create({
        agendamento,
        valor: total,
        status,
      });
    } else {
      recebimento.valor = total;
      recebimento.status = status;
    }
    await this.recebimentoRepo.save(recebimento);
    return { total, pagos, status };
  }

  private calcularTotalItens(agendamento: Agendamento) {
    return (agendamento.itens ?? []).reduce((acc, item) => {
      const quantidade = item.quantidade ?? 1;
      const base = Number(item.valorUnitario ?? 0);
      const desconto = Number(item.descontoValor ?? 0);
      const taxa = Number(item.taxaValor ?? 0);
      const subtotal = (base - desconto + taxa) * quantidade;
      return acc + subtotal;
    }, 0);
  }

  private async estornarRecebimento(agendamentoId: string) {
    const recebimento = await this.recebimentoRepo.findOne({
      where: { agendamento: { id: agendamentoId } },
    });
    if (!recebimento) return;
    recebimento.status = RecebimentoStatus.ESTORNADO;
    await this.recebimentoRepo.save(recebimento);
  }

  private async estornarContaReceber(agendamentoId: string) {
    const conta = await this.contaReceberRepo.findOne({
      where: { agendamento: { id: agendamentoId } },
    });
    if (!conta) return;
    conta.status = ContaReceberStatus.ESTORNADO;
    await this.contaReceberRepo.save(conta);
  }

  private async estornarCashbackSeNecessario(agendamento: Agendamento) {
    if (!agendamento?.usuario?.id || !agendamento?.barbearia?.id) return;
    const recebimento = await this.recebimentoRepo.findOne({
      where: { agendamento: { id: agendamento.id } },
    });
    if (!recebimento || recebimento.status !== RecebimentoStatus.RECEBIDO) return;
    const total = this.calcularTotalItens(agendamento);
    await this.fidelidadeService.debitarCashbackSeguro(
      agendamento.barbearia.id,
      agendamento.usuario.id,
      total,
    );
  }

  private async atualizarContaReceber(agendamentoId: string) {
    const agendamento = await this.repo.findOne({
      where: { id: agendamentoId },
      relations: ['barbearia', 'itens', 'pagamentos'],
    });
    if (!agendamento) {
      throw new NotFoundException('Agendamento nao encontrado');
    }
    const total = this.calcularTotalItens(agendamento);
    const pagos = (agendamento.pagamentos ?? []).reduce((acc, p) => acc + Number(p.valor ?? 0), 0);
    const status =
      pagos >= total && total > 0 ? ContaReceberStatus.PAGO : ContaReceberStatus.PENDENTE;

    let conta = await this.contaReceberRepo.findOne({
      where: { agendamento: { id: agendamentoId } },
      relations: ['barbearia'],
    });
    if (!conta) {
      conta = this.contaReceberRepo.create({
        agendamento,
        barbearia: agendamento.barbearia,
        valor: total,
        status,
      });
    } else {
      conta.valor = total;
      conta.status = status;
    }
    await this.contaReceberRepo.save(conta);
  }

  async estornarPagamento(agendamentoId: string, pagamentoId: string) {
    const pagamento = await this.pagamentoRepo.findOne({
      where: { id: pagamentoId },
      relations: ['agendamento', 'agendamento.barbearia', 'agendamento.usuario'],
    });
    if (!pagamento || pagamento.agendamento.id !== agendamentoId) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    const promocoes = await this.promoRepo.find({
      where: { pagamentoId },
      relations: ['agendamento'],
    });
    for (const promo of promocoes) {
      if (promo.tipo === PromocaoTipo.GIFTCARD && promo.referenciaId) {
        const gift = await this.giftcardRepo.findOne({ where: { id: promo.referenciaId } });
        if (gift) {
          gift.saldoAtual = Number((gift.saldoAtual + promo.valorAplicado).toFixed(2));
          if (gift.status === GiftcardStatus.USADO && gift.saldoAtual > 0) {
            gift.status = GiftcardStatus.ATIVO;
          }
          await this.giftcardRepo.save(gift);
        }
      }
      if (promo.tipo === PromocaoTipo.CASHBACK && pagamento.agendamento.usuario?.id) {
        await this.fidelidadeService.creditarValor(
          pagamento.agendamento.barbearia.id,
          pagamento.agendamento.usuario.id,
          promo.valorAplicado,
        );
      }
      await this.promoRepo.remove(promo);
    }

    await this.pagamentoRepo.remove(pagamento);
    await this.atualizarRecebimento(agendamentoId);
    await this.atualizarContaReceber(agendamentoId);
    await this.audit('PAGAMENTO_ESTORNO', pagamento.agendamento.barbearia.id, pagamento.agendamento.usuario?.id, {
      agendamentoId,
      pagamentoId,
    });
    return { id: pagamentoId };
  }

  async adicionarListaEspera(dto: {
    barbeariaId: string;
    profissionalId: string;
    clienteId?: string;
    telefone?: string;
    dataDesejada: string;
    observacao?: string;
  }) {
    const [barbearia, profissional] = await Promise.all([
      this.em.findOneByOrFail(BarbeariaEntity, { id: dto.barbeariaId }),
      this.em.findOneByOrFail(Profissional, { id: dto.profissionalId }),
    ]);
    if (profissional.barbearia.id !== barbearia.id) {
      throw new BadRequestException('Profissional não pertence à barbearia');
    }
    const cliente = dto.clienteId
      ? await this.em.findOne(ClienteEntity, {
          where: { id: dto.clienteId, barbeariaId: dto.barbeariaId },
        })
      : null;
    const dataDesejada = new Date(dto.dataDesejada);
    if (Number.isNaN(dataDesejada.getTime())) {
      throw new BadRequestException('Data desejada inválida');
    }
    const entity = this.esperaRepo.create({
      barbearia,
      profissional,
      cliente: cliente ?? null,
      telefone: dto.telefone ?? null,
      dataDesejada,
      observacao: dto.observacao ?? null,
      ativo: true,
    });
    return this.esperaRepo.save(entity);
  }

  async listarListaEspera(profissionalId: string, barbeariaId: string) {
    return this.esperaRepo.find({
      where: { profissional: { id: profissionalId }, barbearia: { id: barbeariaId }, ativo: true },
      relations: ['cliente'],
      order: { dataDesejada: 'ASC' },
    });
  }

  private async audit(
    tipo: string,
    barbeariaId: string,
    usuarioId?: string | null,
    payload?: Record<string, unknown>,
  ) {
    try {
      await this.auditoriaService.registrar({
        barbeariaId,
        tipo,
        usuarioId: usuarioId ?? null,
        payload: payload ?? null,
      });
    } catch {
      // evitar quebra de fluxo por falha de auditoria
    }
  }

  private async aplicarPromocaoSeSolicitada(
    agendamento: Agendamento,
    dto: AddPagamentoDto,
  ): Promise<{ promocao?: AgendamentoPromocao; detalhe?: Record<string, unknown> }> {
    const promocoes = [dto.cupomCodigo, dto.giftcardId, dto.cashbackValor && dto.cashbackValor > 0].filter(
      Boolean,
    );
    // Combinação simples: permitir apenas uma promo por pagamento.
    if (promocoes.length > 1) {
      throw new BadRequestException('Use apenas uma promoção por pagamento (cupom/giftcard/cashback)');
    }

    const policy = await this.promoPoliticaService.get(agendamento.barbearia.id);

    if (dto.cupomCodigo) {
      const promo = await this.aplicarCupom(agendamento, dto.cupomCodigo);
      return { promocao: promo, detalhe: { tipo: PromocaoTipo.CUPOM, referenciaId: promo.referenciaId, valor: promo.valorAplicado } };
    }
    if (dto.giftcardId) {
      const promo = await this.aplicarGiftcard(agendamento, dto.giftcardId, dto.valor);
      return { promocao: promo, detalhe: { tipo: PromocaoTipo.GIFTCARD, referenciaId: promo.referenciaId, valor: promo.valorAplicado } };
    }
    if (dto.cashbackValor && dto.cashbackValor > 0) {
      const promo = await this.aplicarCashback(agendamento, dto.cashbackValor);
      return { promocao: promo, detalhe: { tipo: PromocaoTipo.CASHBACK, referenciaId: promo.referenciaId, valor: promo.valorAplicado } };
    }
    return {};
  }

  private async aplicarCupom(agendamento: Agendamento, codigo: string) {
    const cupom = await this.cupomRepo.findOne({
      where: { codigo, barbearia: { id: agendamento.barbearia.id }, ativo: true },
    });
    if (!cupom) throw new NotFoundException('Cupom não encontrado ou inativo');
    if (cupom.expiraEm && new Date(cupom.expiraEm) < new Date()) {
      throw new BadRequestException('Cupom expirado');
    }
    await this.promoPoliticaService.validarPeriodo(agendamento.barbearia.id, PromocaoTipo.CUPOM);
    const total = this.calcularTotalItens(agendamento);
    let desconto = 0;
    if (cupom.percentual) desconto += (total * cupom.percentual) / 100;
    if (cupom.valorFixo) desconto += cupom.valorFixo;
    desconto = Math.min(desconto, total);

    // limites de uso
    if (cupom.limiteUso) {
      const count = await this.promoRepo.count({ where: { referenciaId: cupom.id, tipo: PromocaoTipo.CUPOM } });
      if (count >= cupom.limiteUso) throw new BadRequestException('Limite de uso do cupom atingido');
    }
    if (cupom.limiteUsoPorCliente && agendamento.usuario?.id) {
      const count = await this.promoRepo.count({
        where: { referenciaId: cupom.id, tipo: PromocaoTipo.CUPOM, clienteId: agendamento.usuario.id },
      });
      if (count >= cupom.limiteUsoPorCliente) {
        throw new BadRequestException('Limite de uso por cliente atingido');
      }
    }

    return this.promoRepo.create({
      agendamento,
      tipo: PromocaoTipo.CUPOM,
      referenciaId: cupom.id,
      clienteId: agendamento.usuario?.id ?? null,
      valorAplicado: Number(desconto.toFixed(2)),
    });
  }

  private async aplicarGiftcard(agendamento: Agendamento, giftcardId: string, valorPagamento: number) {
    const gift = await this.giftcardRepo.findOne({
      where: { id: giftcardId, barbearia: { id: agendamento.barbearia.id } },
    });
    if (!gift || gift.status !== GiftcardStatus.ATIVO) throw new BadRequestException('Giftcard inválido');
    if (gift.expiraEm && new Date(gift.expiraEm) < new Date()) {
      throw new BadRequestException('Giftcard expirado');
    }
    await this.promoPoliticaService.validarPeriodo(agendamento.barbearia.id, PromocaoTipo.GIFTCARD);
    const usar = Math.min(gift.saldoAtual, valorPagamento);
    if (usar <= 0) throw new BadRequestException('Saldo insuficiente no giftcard');
    gift.saldoAtual = Number((gift.saldoAtual - usar).toFixed(2));
    if (gift.saldoAtual <= 0) gift.status = GiftcardStatus.USADO;
    await this.giftcardRepo.save(gift);

    return this.promoRepo.create({
      agendamento,
      tipo: PromocaoTipo.GIFTCARD,
      referenciaId: gift.id,
      clienteId: agendamento.usuario?.id ?? null,
      valorAplicado: usar,
    });
  }

  private async aplicarCashback(agendamento: Agendamento, valor: number) {
    if (!agendamento.usuario?.id) {
      throw new BadRequestException('Cashback requer cliente autenticado');
    }
    await this.promoPoliticaService.validarPeriodo(agendamento.barbearia.id, PromocaoTipo.CASHBACK);
    const saldo = await this.cashbackRepo.findOne({
      where: { barbearia: { id: agendamento.barbearia.id }, clienteId: agendamento.usuario.id },
    });
    if (!saldo || saldo.saldo < valor) {
      throw new BadRequestException('Saldo de cashback insuficiente');
    }
    saldo.saldo = Number((saldo.saldo - valor).toFixed(2));
    await this.cashbackRepo.save(saldo);

    return this.promoRepo.create({
      agendamento,
      tipo: PromocaoTipo.CASHBACK,
      referenciaId: null,
      clienteId: agendamento.usuario.id,
      valorAplicado: valor,
    });
  }

  private async registrarNoShowOuCancelamentoTardio(
    policy: PoliticaCancelamento,
    agendamento: Agendamento,
  ) {
    if (!agendamento?.usuario?.id) return;
    const cliente = await this.em.findOne(ClienteEntity, {
      where: { id: agendamento.usuario.id, barbeariaId: agendamento.barbearia.id },
    });
    if (!cliente) return;

    const diffMs = agendamento.dataInicio.getTime() - Date.now();
    const diffHoras = diffMs / (1000 * 60 * 60);
    const atraso = diffHoras < (policy.antecedenciaMinHoras ?? 0);
    if (!atraso) return;

    await this.noShowRepo.save(
      this.noShowRepo.create({
        cliente,
        barbearia: agendamento.barbearia,
      }),
    );

    if (policy.limiteCancelamentoSemAviso && policy.limiteCancelamentoSemAviso > 0) {
      const totalCancelTardio = await this.noShowRepo.count({
        where: {
          cliente: { id: cliente.id },
          barbearia: { id: agendamento.barbearia.id },
        },
      });
      if (totalCancelTardio > policy.limiteCancelamentoSemAviso) {
        throw new BadRequestException('Limite de cancelamentos tardios atingido para este cliente');
      }
    }
  }

  private overlap(
    slot: { inicio: Date; fim: Date },
    intervalos: { inicio: Date; fim: Date }[] = [],
  ): boolean {
    return intervalos.some(
      (i) =>
        i.inicio < slot.fim &&
        i.fim > slot.inicio,
    );
  }

  private mapDiaSemana(jsDay: number): any {
    switch (jsDay) {
      case 0:
        return 'domingo';
      case 1:
        return 'segunda';
      case 2:
        return 'terca';
      case 3:
        return 'quarta';
      case 4:
        return 'quinta';
      case 5:
        return 'sexta';
      case 6:
        return 'sabado';
      default:
        return 'segunda';
    }
  }
}
