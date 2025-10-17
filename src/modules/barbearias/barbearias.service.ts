import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BarbeariaEntity } from './barbearias.entity';
import { CreateBarbeariaDTO } from './barbearia.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BarbeariasService {
  constructor(
    @InjectRepository(BarbeariaEntity)
    private readonly repo: Repository<BarbeariaEntity>,
  ) { }

  async create(data: CreateBarbeariaDTO) {
    const existing = await this.findByEmail(data.email);

    if (existing) {
      throw new ConflictException('Barbearia com este e-mail já cadastrada.');
    }

    const senhaHash = await bcrypt.hash(data.senha, 10);
    const entity = await this.repo.create({
      ...data,
      senha: senhaHash,
      dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : undefined,
      validadeLicenca: data.validadeLicenca ? new Date(data.validadeLicenca) : undefined,
    });
    await this.repo.save(entity);
    const { senha, ...entitySemSenha } = entity;
    return entitySemSenha;
  }

  findAll() {
    return this.repo.find();
  }

  async findOne(id: string) {
    const barbearia = await this.repo.findOne({ where: { id } });

    if (!barbearia) {
      throw new NotFoundException('Barbearia não encontrada.');
    }

    return barbearia;
  }

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async remove(id: string) {
    const result = await this.repo.delete({ id });

    if (!result.affected) {
      throw new NotFoundException('Barbearia não encontrada.');
    }
  }
}
