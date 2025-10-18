import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateBarbeariaDTO, UpdateBarbeariaDTO } from './barbearia.dto';
import * as bcrypt from 'bcrypt';
import { BarbeariaEntity } from './barbearias.entity';
import {
  DiaSemana,
  HorarioFuncionamento,
} from './horario-funcionamento.entity';
import {
  HorarioFuncionamentoItemDTO,
  UpsertHorarioFuncionamentoDTO,
} from './horario-funcionamento.dto';

@Injectable()
export class BarbeariasService {
  constructor(
    @InjectRepository(BarbeariaEntity)
    private readonly repo: Repository<BarbeariaEntity>,
    @InjectRepository(HorarioFuncionamento)
    private readonly horariosRepo: Repository<HorarioFuncionamento>,
  ) { }

  async create(data: CreateBarbeariaDTO) {
    const existing = await this.findByEmail(data.email);

    if (existing) {
      throw new ConflictException('Barbearia com este e-mail ja cadastrada.');
    }

    const link = this.buildLink(data.nome);
    const linkAlreadyExists = await this.repo.findOne({ where: { link } });
    if (linkAlreadyExists) {
      throw new ConflictException('Ja existe uma barbearia com este link.');
    }

    const senhaHash = await bcrypt.hash(data.senha, 10);
    const entity = this.repo.create({
      ...data,
      senha: senhaHash,
      link,
      emailValidado: false,
      telefoneValidado: false,
      dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : undefined,
      validadeLicenca: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 30),
    });
    await this.repo.save(entity);
    const { senha, ...entitySemSenha } = entity;
    return entitySemSenha;
  }

  async findAll() {
    const allBarbearia = await this.repo.find();

    return allBarbearia.map((barbearia) => {
      const { senha, ...result } = barbearia;
      return result;
    });
  }

  async findOne(id: string) {
    const barbearia = await this.repo.findOne({ where: { id } });

    if (!barbearia) {
      throw new NotFoundException('Barbearia nao encontrada.');
    }
    const { senha, ...result } = barbearia;
    return result;
  }

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  findByLink(link: string) {
    return this.repo.findOne({ where: { link } });
  }

  async findOneByLink(link: string) {
    const barbearia = await this.repo.findOne({ where: { link } });
    if (!barbearia) {
      throw new NotFoundException('Barbearia nao encontrada.');
    }
    const { senha, ...result } = barbearia;
    return result;
  }

  async update(id: string, data: UpdateBarbeariaDTO) {
    const barbearia = await this.repo.findOne({ where: { id } });
    if (!barbearia) {
      throw new NotFoundException('Barbearia nao encontrada.');
    }

    if (data.email && data.email !== barbearia.email) {
      const anotherWithEmail = await this.repo.findOne({
        where: { email: data.email },
      });
      if (anotherWithEmail) {
        throw new ConflictException('Barbearia com este e-mail ja cadastrada.');
      }
    }

    let link = barbearia.link;
    if (data.nome) {
      const nextLink = this.buildLink(data.nome);
      if (nextLink !== barbearia.link) {
        const anotherWithLink = await this.repo.findOne({ where: { link: nextLink } });
        if (anotherWithLink && anotherWithLink.id !== id) {
          throw new ConflictException('Ja existe uma barbearia com este link.');
        }
        link = nextLink;
      }
    }

    const updated = await this.repo.save({
      ...barbearia,
      ...data,
      link,
      dataNascimento:
        data.dataNascimento !== undefined
          ? this.parseIsoDate(data.dataNascimento)
          : barbearia.dataNascimento,
      validadeLicenca:
        data.validadeLicenca !== undefined
          ? this.parseIsoDate(data.validadeLicenca)
          : barbearia.validadeLicenca,
    });

    const { senha, ...result } = updated;
    return result;
  }

  async updatePassword(id: string, senhaAtual: string, novaSenha: string) {
    const barbearia = await this.repo.findOne({ where: { id } });
    if (!barbearia) {
      throw new NotFoundException('Barbearia nao encontrada.');
    }
    const senhaConfere = await bcrypt.compare(senhaAtual, barbearia.senha);
    if (!senhaConfere) {
      throw new BadRequestException('Senha atual incorreta.');
    }
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await this.repo.update({ id }, { senha: senhaHash });
  }

  async remove(id: string) {
    const result = await this.repo.delete({ id });

    if (!result.affected) {
      throw new NotFoundException('Barbearia nao encontrada.');
    }
  }

  async listHorarios(barbeariaId: string) {
    await this.ensureBarbeariaExists(barbeariaId);

    const horarios = await this.horariosRepo.find({
      where: { barbearia: { id: barbeariaId } },
      order: { diaSemana: 'ASC', abre: 'ASC' },
    });

    return horarios.map((horario) => ({
      id: horario.id,
      diaSemana: horario.diaSemana,
      abre: horario.abre ?? null,
      fecha: horario.fecha ?? null,
      ativo: horario.ativo,
    }));
  }

  async replaceHorarios(
    barbeariaId: string,
    { horarios }: UpsertHorarioFuncionamentoDTO,
  ) {
    const barbearia = await this.ensureBarbeariaExists(barbeariaId);

    this.validateHorariosPayload(horarios ?? []);

    await this.horariosRepo
      .createQueryBuilder()
      .delete()
      .where('barbeariaId = :barbeariaId', { barbeariaId })
      .execute();

    if (!horarios?.length) {
      return [];
    }

    const entities = horarios.map((item) => {
      const entity = this.horariosRepo.create();
      entity.diaSemana = item.diaSemana;
      entity.abre = item.ativo ? item.abre ?? null : null;
      entity.fecha = item.ativo ? item.fecha ?? null : null;
      entity.ativo = item.ativo;
      entity.barbearia = barbearia;
      return entity;
    });

    await this.horariosRepo.save(entities);

    return this.listHorarios(barbeariaId);
  }

  private parseIsoDate(value?: string) {
    return value ? new Date(value) : undefined;
  }

  private buildLink(nome: string) {
    return nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  private async ensureBarbeariaExists(id: string) {
    const barbearia = await this.repo.findOne({ where: { id } });
    if (!barbearia) {
      throw new NotFoundException('Barbearia nao encontrada.');
    }
    return barbearia;
  }

  private validateHorariosPayload(horarios: HorarioFuncionamentoItemDTO[]) {
    const intervalosPorDia = new Map<DiaSemana, HorarioFuncionamentoItemDTO[]>();

    horarios.forEach((horario) => {
      if (horario.ativo) {
        if (!horario.abre || !horario.fecha) {
          throw new BadRequestException(
            `Intervalo ativo em ${horario.diaSemana} deve possuir horarios de abertura e fechamento.`,
          );
        }
        const inicio = this.timeToMinutes(horario.abre);
        const fim = this.timeToMinutes(horario.fecha);
        if (inicio >= fim) {
          throw new BadRequestException(
            `Horario de fechamento deve ser maior que o de abertura (${horario.diaSemana}).`,
          );
        }
      } else if (horario.abre || horario.fecha) {
        throw new BadRequestException(
          `Dia marcado como fechado nao deve possuir horarios (${horario.diaSemana}).`,
        );
      }

      const lista = intervalosPorDia.get(horario.diaSemana) ?? [];
      lista.push(horario);
      intervalosPorDia.set(horario.diaSemana, lista);
    });

    intervalosPorDia.forEach((intervalos, dia) => {
      const ativos = intervalos.filter((item) => item.ativo);
      const fechados = intervalos.filter((item) => !item.ativo);

      if (fechados.length > 1) {
        throw new BadRequestException(
          `Dia ${dia} possui multiplos registros marcados como fechado.`,
        );
      }

      if (fechados.length === 1 && ativos.length) {
        throw new BadRequestException(
          `Dia ${dia} nao pode ter intervalos ativos e estar marcado como fechado.`,
        );
      }

      const ordenados = [...ativos].sort(
        (a, b) => this.timeToMinutes(a.abre!) - this.timeToMinutes(b.abre!),
      );

      for (let i = 1; i < ordenados.length; i++) {
        const anterior = ordenados[i - 1];
        const atual = ordenados[i];
        if (this.timeToMinutes(atual.abre!) < this.timeToMinutes(anterior.fecha!)) {
          throw new BadRequestException(
            `Intervalos de ${dia} nao podem se sobrepor.`,
          );
        }
      }
    });
  }

  private timeToMinutes(valor: string) {
    const [horas, minutos] = valor.split(':').map(Number);
    return horas * 60 + minutos;
  }
}
