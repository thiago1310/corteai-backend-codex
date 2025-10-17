import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profissional } from './profissionais.entity';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm/dist/common/typeorm.decorators';
import * as bcrypt from 'bcrypt';

export class CreateProfissionalDto {
  nome!: string;
  email!: string;
  telefone?: string;
  comissao?: number;
  barbeariaId!: string;
  senha?: string;
}

@Injectable()
export class ProfissionaisService {
  constructor(
    @InjectRepository(Profissional)
    private readonly repo: Repository<Profissional>,
    @InjectEntityManager() private readonly em: EntityManager,
  ) {}

  async create(data: CreateProfissionalDto) {
    const barbearia = await this.em.findOneByOrFail(BarbeariaEntity, {
      id: data.barbeariaId,
    });
    const senhaHash = data.senha ? await bcrypt.hash(data.senha, 10) : undefined;
    const entity = this.repo.create({
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      comissao: data.comissao ?? 0,
      barbearia,
      senha: senhaHash,
    });
    return this.repo.save(entity);
  }

  findAll() {
    return this.repo.find({ relations: ['barbearia'] });
  }

  async updatePassword(id: string, novaSenha: string) {
    const profissional = await this.repo.findOne({ where: { id } });
    if (!profissional) {
      throw new NotFoundException('Profissional nao encontrado.');
    }
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await this.repo.update({ id }, { senha: senhaHash });
  }
}
