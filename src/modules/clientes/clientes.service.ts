import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { ClienteEntity } from './clientes.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(ClienteEntity)
    private readonly repo: Repository<ClienteEntity>,
  ) {}

  async create(dto: CreateClienteDto) {
    const existente = await this.findByEmail(dto.email);
    if (existente) {
      throw new ConflictException('Cliente com este e-mail ja cadastrado.');
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);
    const entity = this.repo.create({
      nome: dto.nome,
      email: dto.email,
      senhaHash,
      telefone: dto.telefone ?? null,
      cpfCnpj: dto.cpfCnpj ?? null,
      status: dto.status ?? 'ativo',
      plano: dto.plano ?? 'basico',
    });

    const salvo = await this.repo.save(entity);
    return this.omitirSenha(salvo);
  }

  async findAll() {
    const itens = await this.repo.find({ order: { criadoEm: 'DESC' } });
    return itens.map((item) => this.omitirSenha(item));
  }

  async findOne(id: string) {
    const cliente = await this.repo.findOne({ where: { id } });
    if (!cliente) {
      throw new NotFoundException('Cliente nao encontrado.');
    }
    return this.omitirSenha(cliente);
  }

  async update(id: string, dto: UpdateClienteDto) {
    const cliente = await this.repo.findOne({ where: { id } });
    if (!cliente) {
      throw new NotFoundException('Cliente nao encontrado.');
    }

    if (dto.email && dto.email !== cliente.email) {
      const existente = await this.repo.findOne({ where: { email: dto.email } });
      if (existente && existente.id !== id) {
        throw new ConflictException('Cliente com este e-mail ja cadastrado.');
      }
    }

    Object.assign(cliente, {
      nome: dto.nome ?? cliente.nome,
      email: dto.email ?? cliente.email,
      telefone: dto.telefone ?? cliente.telefone,
      cpfCnpj: dto.cpfCnpj ?? cliente.cpfCnpj,
      status: dto.status ?? cliente.status,
      plano: dto.plano ?? cliente.plano,
    });

    const salvo = await this.repo.save(cliente);
    return this.omitirSenha(salvo);
  }

  async updatePassword(id: string, senhaAtual: string, novaSenha: string) {
    const cliente = await this.repo
      .createQueryBuilder('cliente')
      .addSelect('cliente.senhaHash')
      .where('cliente.id = :id', { id })
      .getOne();

    if (!cliente) {
      throw new NotFoundException('Cliente nao encontrado.');
    }

    const senhaConfere = await bcrypt.compare(senhaAtual, cliente.senhaHash);
    if (!senhaConfere) {
      throw new BadRequestException('Senha atual incorreta.');
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await this.repo.update({ id }, { senhaHash });
  }

  findByEmail(email: string) {
    return this.repo
      .createQueryBuilder('cliente')
      .addSelect('cliente.senhaHash')
      .where('cliente.email = :email', { email })
      .getOne();
  }

  private omitirSenha(cliente: ClienteEntity) {
    const { senhaHash, ...resto } = cliente as ClienteEntity & { senhaHash?: string };
    void senhaHash;
    return resto;
  }
}
