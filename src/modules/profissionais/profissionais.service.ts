import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { InjectEntityManager } from '@nestjs/typeorm/dist/common/typeorm.decorators';

import { Profissional } from './profissionais.entity';
import { ProfissionalHorario } from './profissional-horario.entity';
import { CreateProfissionalDto } from './dto/create-profissional.dto';
import { UpdateProfissionalDto } from './dto/update-profissional.dto';
import { ProfissionalHorarioItemDto } from './dto/profissional-horario.dto';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import {
  HorarioFuncionamento,
  DiaSemana,
} from '../barbearias/horario-funcionamento.entity';
import { Servico } from '../servicos/servicos.entity';

@Injectable()
export class ProfissionaisService {
  constructor(
    @InjectRepository(Profissional)
    private readonly repo: Repository<Profissional>,
    @InjectRepository(ProfissionalHorario)
    private readonly horariosRepo: Repository<ProfissionalHorario>,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  async create(barbeariaId: string, data: CreateProfissionalDto) {
    const barbearia = await this.ensureBarbearia(barbeariaId);
    await this.ensureProfissionalEmailDisponivel(data.email);
    this.ensureHorariosValid(data.horarios, barbearia.horarios);

    const senhaHash = data.senha ? await bcrypt.hash(data.senha, 10) : undefined;
    const servicos = await this.loadServicos(data.servicosIds, barbeariaId);

    const entity = this.repo.create({
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      comissao: data.comissao ?? 0,
      barbearia,
      senha: senhaHash,
      servicos,
    });

    const saved = await this.repo.save(entity);
    await this.replaceHorarios(saved, data.horarios);
    return this.getDetalhe(saved.id, barbeariaId);
  }

  findAll(barbeariaId: string) {
    return this.repo.find({
      where: { barbearia: { id: barbeariaId } },
      relations: ['barbearia', 'horarios', 'servicos'],
      order: { nome: 'ASC' },
    });
  }

  findOne(id: string, barbeariaId: string) {
    return this.getDetalhe(id, barbeariaId);
  }

  async update(id: string, barbeariaId: string, data: UpdateProfissionalDto) {
    const profissional = await this.findOwnedOrThrow(id, barbeariaId);

    if (data.email && data.email !== profissional.email) {
      await this.ensureProfissionalEmailDisponivel(data.email, id);
    }

    if (data.horarios) {
      const barbearia = await this.ensureBarbearia(barbeariaId);
      this.ensureHorariosValid(data.horarios, barbearia.horarios);
    }

    if (data.servicosIds) {
      profissional.servicos = await this.loadServicos(data.servicosIds, barbeariaId);
    }

    if (data.nome !== undefined) {
      profissional.nome = data.nome;
    }
    if (data.email !== undefined) {
      profissional.email = data.email;
    }
    if (data.telefone !== undefined) {
      profissional.telefone = data.telefone;
    }
    if (data.comissao !== undefined) {
      profissional.comissao = data.comissao;
    }
    if (data.senha) {
      profissional.senha = await bcrypt.hash(data.senha, 10);
    }

    await this.repo.save(profissional);

    if (data.horarios) {
      await this.replaceHorarios(profissional, data.horarios);
    }

    return this.getDetalhe(id, barbeariaId);
  }

  async remove(id: string, barbeariaId: string) {
    const profissional = await this.findOwnedOrThrow(id, barbeariaId);
    await this.repo.remove(profissional);
    return { id };
  }

  async updatePassword(id: string, senhaAtual: string, novaSenha: string) {
    const profissional = await this.repo
      .createQueryBuilder('profissional')
      .addSelect('profissional.senha')
      .where('profissional.id = :id', { id })
      .getOne();

    if (!profissional) {
      throw new NotFoundException('Profissional nao encontrado.');
    }
    if (!profissional.senha) {
      throw new BadRequestException('Profissional sem senha cadastrada.');
    }
    const senhaConfere = await bcrypt.compare(senhaAtual, profissional.senha);
    if (!senhaConfere) {
      throw new BadRequestException('Senha atual incorreta.');
    }
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await this.repo.update({ id }, { senha: senhaHash });
  }

  private async getDetalhe(id: string, barbeariaId: string) {
    const profissional = await this.repo.findOne({
      where: { id, barbearia: { id: barbeariaId } },
      relations: ['barbearia', 'horarios', 'servicos'],
    });
    if (!profissional) {
      throw new NotFoundException('Profissional nao encontrado.');
    }
    return profissional;
  }

  private async findOwnedOrThrow(id: string, barbeariaId: string) {
    const profissional = await this.repo.findOne({
      where: { id },
      relations: ['barbearia'],
    });

    if (!profissional) {
      throw new NotFoundException('Profissional nao encontrado.');
    }

    if (!profissional.barbearia || profissional.barbearia.id !== barbeariaId) {
      throw new ForbiddenException('Profissional pertence a outra barbearia.');
    }

    return profissional;
  }

  private async ensureProfissionalEmailDisponivel(email: string, ignoreId?: string) {
    const existing = await this.repo.findOne({ where: { email } });
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Ja existe um profissional com este e-mail.');
    }
  }

  private async ensureBarbearia(id: string) {
    const barbearia = await this.em.findOne(BarbeariaEntity, {
      where: { id },
      relations: ['horarios'],
    });
    if (!barbearia) {
      throw new NotFoundException('Barbearia nao encontrada.');
    }
    return barbearia;
  }

  private ensureHorariosValid(
    horarios: ProfissionalHorarioItemDto[],
    horariosBarbearia: HorarioFuncionamento[] = [],
  ) {
    if (!horarios?.length) {
      throw new BadRequestException('Profissional deve possuir ao menos um horario.');
    }

    const mapaFuncionamento = new Map<
      DiaSemana,
      { inicio: number; fim: number }[]
    >();
    horariosBarbearia
      .filter((horario) => horario.ativo && horario.abre && horario.fecha)
      .forEach((horario) => {
        const lista = mapaFuncionamento.get(horario.diaSemana) ?? [];
        lista.push({
          inicio: this.timeToMinutes(horario.abre!),
          fim: this.timeToMinutes(horario.fecha!),
        });
        mapaFuncionamento.set(horario.diaSemana, lista);
      });

    const ocupados = new Map<DiaSemana, { inicio: number; fim: number }[]>();

    horarios.forEach((item) => {
      const inicio = this.timeToMinutes(item.abre);
      const fim = this.timeToMinutes(item.fecha);

      if (inicio >= fim) {
        throw new BadRequestException(
          `Horario ${item.abre}-${item.fecha} possui intervalo invalido.`,
        );
      }

      if (!item.diasSemana.length) {
        throw new BadRequestException('Cada intervalo deve ter ao menos um dia associado.');
      }

      const diasUnicos = new Set(item.diasSemana);
      if (diasUnicos.size !== item.diasSemana.length) {
        throw new BadRequestException('Intervalo possui dias duplicados.');
      }

      diasUnicos.forEach((dia) => {
        const funcionamentoDia = mapaFuncionamento.get(dia);
        if (!funcionamentoDia?.length) {
          throw new BadRequestException(
            `Barbearia nao possui funcionamento ativo em ${dia}.`,
          );
        }
        const compatível = funcionamentoDia.some(
          (intervalo) => inicio >= intervalo.inicio && fim <= intervalo.fim,
        );
        if (!compatível) {
          throw new BadRequestException(
            `Intervalo ${item.abre}-${item.fecha} em ${dia} esta fora do horario da barbearia.`,
          );
        }

        const ocupacoes = ocupados.get(dia) ?? [];
        if (ocupacoes.some((intervalo) => inicio < intervalo.fim && fim > intervalo.inicio)) {
          throw new BadRequestException(`Intervalos de ${dia} nao podem se sobrepor.`);
        }
        ocupacoes.push({ inicio, fim });
        ocupados.set(dia, ocupacoes);
      });
    });
  }

  private timeToMinutes(valor: string) {
    const [horas, minutos] = valor.split(':').map(Number);
    return horas * 60 + minutos;
  }

  private async replaceHorarios(
    profissional: Profissional,
    horarios: ProfissionalHorarioItemDto[],
  ) {
    await this.horariosRepo
      .createQueryBuilder()
      .delete()
      .where('profissionalId = :profissionalId', { profissionalId: profissional.id })
      .execute();

    if (!horarios?.length) {
      return;
    }

    const entities = horarios.map((item) =>
      this.horariosRepo.create({
        profissional,
        diasSemana: item.diasSemana,
        abre: item.abre,
        fecha: item.fecha,
      }),
    );

    await this.horariosRepo.save(entities);
  }

  private async loadServicos(ids: string[] | undefined, barbeariaId: string) {
    if (!ids?.length) {
      return [];
    }

    const servicos = await this.em.find(Servico, {
      where: { id: In(ids), barbearia: { id: barbeariaId } },
    });

    if (servicos.length !== ids.length) {
      throw new NotFoundException('Um ou mais servicos nao foram encontrados.');
    }

    return servicos;
  }
}
