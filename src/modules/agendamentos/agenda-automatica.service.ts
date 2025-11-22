import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Profissional } from '../profissionais/profissionais.entity';
import { Agendamento } from './agendamentos.entity';
import { HorarioFuncionamento } from '../barbearias/horario-funcionamento.entity';
import { DiaSemana } from '../barbearias/horario-funcionamento.entity';

@Injectable()
export class AgendaAutomaticaService {
  private readonly logger = new Logger(AgendaAutomaticaService.name);

  constructor(
    @InjectRepository(Profissional) private readonly profissionalRepo: Repository<Profissional>,
    @InjectRepository(Agendamento) private readonly agendamentoRepo: Repository<Agendamento>,
    @InjectRepository(HorarioFuncionamento)
    private readonly horarioRepo: Repository<HorarioFuncionamento>,
  ) {}

  /**
   * Gera agendas para os próximos 7 dias caso não existam slots para o profissional.
   * Lógica simplificada: apenas cria placeholders (sem persistir slots detalhados),
   * garantindo que existam registros de agendamento PENDENTE disponíveis.
   */
  async gerarParaProximos7Dias(profissionalId: string) {
    const hoje = this.startOfDay(new Date());
    const limite = this.endOfDay(this.addDays(hoje, 7));

    const profissional = await this.profissionalRepo.findOne({
      where: { id: profissionalId },
      relations: ['barbearia'],
    });
    if (!profissional) return;

    const horarios = await this.horarioRepo.find({
      where: { barbearia: { id: profissional.barbearia.id } },
    });
    if (!horarios.length) return;

    for (let dia = 0; dia <= 7; dia++) {
      const data = this.addDays(hoje, dia);
      const diaSemana = data.getDay(); // 0-dom, 1-seg ...
      const key = this.mapDiaSemana(diaSemana);
      const horarioDia = horarios.find((h) => h.diaSemana === key && h.ativo);
      if (!horarioDia || !horarioDia.abre || !horarioDia.fecha) continue;

      const inicio = new Date(
        `${data.toISOString().split('T')[0]}T${horarioDia.abre}:00.000Z`,
      );
      const fim = new Date(
        `${data.toISOString().split('T')[0]}T${horarioDia.fecha}:00.000Z`,
      );
      // Verificar se já existe algo neste dia
      const existente = await this.agendamentoRepo.findOne({
        where: {
          profissional: { id: profissionalId },
          dataInicio: MoreThanOrEqual(inicio),
          dataFimPrevisto: MoreThanOrEqual(inicio),
        },
      });
      if (existente) continue;

      // Criar slots a cada 60 minutos (simplificado; ideal usar tempo de serviço)
      const slots: Pick<Agendamento, 'dataInicio' | 'dataFimPrevisto'>[] = [];
      let cursor = inicio;
      while (cursor < fim) {
        const prox = this.addMinutes(cursor, 60);
        if (prox > fim) break;
        slots.push({ dataInicio: cursor, dataFimPrevisto: prox });
        cursor = prox;
      }

      // Criar registros placeholder (sem cliente) para liberar agenda
      if (slots.length) {
        const placeholders = slots.map((s) =>
          this.agendamentoRepo.create({
            profissional,
            barbearia: profissional.barbearia,
            usuario: null as any,
            dataInicio: s.dataInicio,
            dataFimPrevisto: s.dataFimPrevisto,
          }),
        );
        await this.agendamentoRepo.save(placeholders);
        this.logger.verbose(`Agenda auto gerada para profissional ${profissionalId} em ${data}`);
      }
    }
  }

  private mapDiaSemana(jsDay: number): DiaSemana {
    switch (jsDay) {
      case 0:
        return DiaSemana.DOMINGO;
      case 1:
        return DiaSemana.SEGUNDA;
      case 2:
        return DiaSemana.TERCA;
      case 3:
        return DiaSemana.QUARTA;
      case 4:
        return DiaSemana.QUINTA;
      case 5:
        return DiaSemana.SEXTA;
      case 6:
        return DiaSemana.SABADO;
      default:
        return DiaSemana.SEGUNDA;
    }
  }

  private addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  private addMinutes(date: Date, minutes: number) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() + minutes);
    return d;
  }

  private startOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }
}
