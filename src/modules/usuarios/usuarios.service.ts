import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario, UsuarioTipo } from './usuarios.entity';
import * as bcrypt from 'bcrypt';

export class CreateUsuarioDto {
  nome!: string;
  telefone?: string;
  email!: string;
  dataNascimento?: Date;
  cpf!: string;
  senha!: string;
  tipo?: UsuarioTipo;
}

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario) private readonly repo: Repository<Usuario>,
  ) {}

  async create(data: CreateUsuarioDto) {
    const senhaHash = await bcrypt.hash(data.senha, 10);
    const usuario = this.repo.create({
      ...data,
      senha: senhaHash,
      tipo: data.tipo ?? UsuarioTipo.CLIENTE,
    });
    return this.repo.save(usuario);
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

  async remove(id: string) {
    await this.repo.delete(id);
  }
}
