import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateBarbeariaDTO, UpdateBarbeariaDTO } from './barbearia.dto';
import * as bcrypt from 'bcrypt';
import { BarbeariaEntity } from './barbearias.entity';

@Injectable()
export class BarbeariasService {
  constructor(
    @InjectRepository(BarbeariaEntity)
    private readonly repo: Repository<BarbeariaEntity>,
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

  async updatePassword(id: string, novaSenha: string) {
    const barbearia = await this.repo.findOne({ where: { id } });
    if (!barbearia) {
      throw new NotFoundException('Barbearia nao encontrada.');
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
}
