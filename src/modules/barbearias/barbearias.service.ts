import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Barbearia } from './barbearias.entity';
import * as bcrypt from 'bcrypt';

export class CreateBarbeariaDto {
  nome!: string;
  cpfCnpj!: string;
  email!: string;
  senha!: string;
  telefone?: string;
  dataNascimento?: Date;
  emailValidado?: boolean;
  telefoneValidado?: boolean;
  statusAberto?: boolean;
  validadeLicenca?: Date;
  cep?: string;
  uf?: string;
  cidade?: string;
  bairro?: string;
  rua?: string;
  numero?: string;
}

@Injectable()
export class BarbeariasService {
  constructor(
    @InjectRepository(Barbearia) private readonly repo: Repository<Barbearia>,
  ) {}

  async create(data: CreateBarbeariaDto) {
    const senhaHash = await bcrypt.hash(data.senha, 10);
    const entity = this.repo.create({ ...data, senha: senhaHash });
    return this.repo.save(entity);
  }

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }
}
