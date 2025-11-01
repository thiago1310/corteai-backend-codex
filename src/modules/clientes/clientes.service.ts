import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ClienteEntity } from './clientes.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { BuscarClientesFiltroDto } from './dto/buscar-clientes.dto';
import { ConexaoEvolutionEntity } from '../ai-agent/entities/conexao-evolution.entity';
import { ChatHistoryEntity } from '../ai-agent/entities/chat-history.entity';
import { SincronizarClienteEvolutionDto } from './dto/sincronizar-cliente-evolution.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(ClienteEntity)
    private readonly clientesRepo: Repository<ClienteEntity>,
    @InjectRepository(ConexaoEvolutionEntity)
    private readonly conexoesRepo: Repository<ConexaoEvolutionEntity>,
    @InjectRepository(ChatHistoryEntity)
    private readonly chatHistoryRepo: Repository<ChatHistoryEntity>,
  ) { }

  async criar(barbeariaId: string, dto: CreateClienteDto) {
    const telefone = this.normalizarTelefone(dto.telefone);
    await this.garantirTelefoneDisponivel(barbeariaId, telefone);

    const cliente = this.clientesRepo.create({
      barbeariaId,
      nome: this.sanitizarTexto(dto.nome),
      telefone,
      email: this.sanitizarTexto(dto.email),
      cpf: this.sanitizarTexto(dto.cpf),
      dataCadastro: dto.dataCadastro ? new Date(dto.dataCadastro) : undefined,
      dataAniversario: dto.dataAniversario ? new Date(dto.dataAniversario) : undefined,
    });

    return this.clientesRepo.save(cliente);
  }

  async listar(barbeariaId: string, filtro: BuscarClientesFiltroDto) {
    const qb = this.clientesRepo
      .createQueryBuilder('cliente')
      .where('cliente.barbeariaId = :barbeariaId', { barbeariaId });

    const nomeFiltro = filtro.nome?.trim();
    if (nomeFiltro) {
      qb.andWhere('LOWER(cliente.nome) LIKE LOWER(:nome)', {
        nome: `%${nomeFiltro}%`,
      });
    }

    const telefoneFiltro = filtro.telefone?.replace(/\s+/g, '');
    if (telefoneFiltro) {
      qb.andWhere('REPLACE(cliente.telefone, \' \', \'\') LIKE :telefone', {
        telefone: `%${telefoneFiltro}%`,
      });
    }



    return qb.orderBy('cliente.dataCadastro', 'DESC').getMany();
  }

  async buscarPorId(barbeariaId: string, id: string) {
    const cliente = await this.clientesRepo.findOne({
      where: { id, barbeariaId },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente nao encontrado.');
    }

    return cliente;
  }

  async atualizar(barbeariaId: string, id: string, dto: UpdateClienteDto) {
    const cliente = await this.buscarPorId(barbeariaId, id);

    if (dto.telefone) {
      const telefone = this.normalizarTelefone(dto.telefone);
      if (telefone !== cliente.telefone) {
        await this.garantirTelefoneDisponivel(barbeariaId, telefone, cliente.id);
        cliente.telefone = telefone;
      }
    }

    if (dto.nome !== undefined) {
      cliente.nome = this.sanitizarTexto(dto.nome) ?? null;
    }

    if (dto.email !== undefined) {
      cliente.email = this.sanitizarTexto(dto.email) ?? null;
    }

    if (dto.cpf !== undefined) {
      cliente.cpf = this.sanitizarTexto(dto.cpf) ?? null;
    }



    if (dto.dataCadastro !== undefined) {
      cliente.dataCadastro = dto.dataCadastro ? new Date(dto.dataCadastro) : cliente.dataCadastro;
    }

    if (dto.dataAniversario !== undefined) {
      cliente.dataAniversario = dto.dataAniversario ? new Date(dto.dataAniversario) : null;
    }

    await this.clientesRepo.save(cliente);
    return cliente;
  }

  async remover(barbeariaId: string, id: string) {
    const cliente = await this.buscarPorId(barbeariaId, id);
    await this.clientesRepo.delete(cliente.id);
    return { removido: true };
  }

  async sincronizarComEvolution(dto: SincronizarClienteEvolutionDto) {
    this.validarToken(dto.token);



    const instanceNormalizada = this.normalizarInstance(dto.instanceName);
    const conexao = await this.conexaoPorInstance(instanceNormalizada);

    const telefonePayload = dto.telefone ? this.normalizarTelefone(dto.telefone) : undefined;
    let telefone = telefonePayload;

    if (!telefone) {
      const messageIdNormalizado = dto.messageId?.toString().trim();
      if (!messageIdNormalizado) {
        throw new BadRequestException('Informe o telefone ou um messageId valido.');
      }

      const chat = await this.chatHistoryRepo.findOne({
        where: {
          messageId: messageIdNormalizado,
          barbeariaId: conexao.barbeariaId,
        },
        order: { createdAt: 'DESC' },
      });

      if (!chat || !chat.telefoneCliente) {
        throw new BadRequestException('Telefone nao encontrado para o messageId informado.');
      }

      telefone = this.normalizarTelefone(chat.telefoneCliente);
    }

    if (!telefone) {
      throw new BadRequestException('Nao foi possivel determinar o telefone do cliente.');
    }

    let cliente = await this.clientesRepo.findOne({
      where: { barbeariaId: conexao.barbeariaId, telefone },
    });

    if (!cliente) {
      cliente = this.clientesRepo.create({
        barbeariaId: conexao.barbeariaId,
        telefone,
        nome: this.sanitizarTexto(dto.nome),
        email: this.sanitizarTexto(dto.email),
        cpf: this.sanitizarTexto(dto.cpf),
        dataAniversario: dto.dataAniversario ? new Date(dto.dataAniversario) : undefined,
      });
    } else {
      if (cliente.nome == "" && dto.nome !== undefined) {
        cliente.nome = this.sanitizarTexto(dto.nome) ?? cliente.nome ?? null;
      }

      if (dto.email !== undefined) {
        cliente.email = this.sanitizarTexto(dto.email) ?? cliente.email ?? null;
      }

      if (dto.cpf !== undefined) {
        cliente.cpf = this.sanitizarTexto(dto.cpf) ?? cliente.cpf ?? null;
      }


      if (dto.dataAniversario !== undefined) {
        cliente.dataAniversario = dto.dataAniversario ? new Date(dto.dataAniversario) : cliente.dataAniversario ?? null;
      }
    }

    const clienteSalvo = await this.clientesRepo.save(cliente);

    const historico = await this.chatHistoryRepo.find({
      where: {
        barbeariaId: conexao.barbeariaId,
        telefoneCliente: telefone,
      },
      order: { createdAt: 'DESC' },
      take: 40,
    });

    const conversas = historico
      .reverse()
      .map((item) => ({ role: item.role, content: item.content }));

    return {
      cliente: clienteSalvo,
      historico: conversas,
    };
  }

  private async garantirTelefoneDisponivel(
    barbeariaId: string,
    telefone: string,
    ignorarId?: string,
  ) {
    const existente = await this.clientesRepo.findOne({
      where: { barbeariaId, telefone },
    });

    if (existente && existente.id !== ignorarId) {
      throw new BadRequestException('Telefone ja cadastrado para esta barbearia.');
    }
  }

  private normalizarTelefone(telefone?: string) {
    const valor = telefone?.toString().trim();
    if (!valor) {
      throw new BadRequestException('Telefone obrigatorio.');
    }
    return valor.replace(/\s+/g, '');
  }

  private normalizarInstance(instance?: string) {
    const valor = instance?.toString().trim();
    if (!valor) {
      throw new BadRequestException('InstanceName obrigatorio.');
    }
    return valor.replace(/-/g, '');
  }

  private async conexaoPorInstance(instanceNormalizada: string) {
    const conexao =
      (await this.conexoesRepo.findOne({
        where: { instanceName: instanceNormalizada },
      })) ??
      (await this.conexoesRepo
        .createQueryBuilder('conexao')
        .where('LOWER(REPLACE(conexao.instanceName, \'-\', \'\')) = :instance', {
          instance: instanceNormalizada.toLowerCase(),
        })
        .getOne());

    if (!conexao) {
      throw new NotFoundException('Instancia Evolution nao encontrada.');
    }

    return conexao;
  }

  private validarToken(token?: string) {
    const segredo = process.env.CLIENTES_WEBHOOK_TOKEN ?? '';
    if (!token || !segredo || token !== segredo) {
      throw new BadRequestException('Token invalido.');
    }
  }

  private sanitizarTexto(valor?: string | null) {
    if (valor === undefined || valor === null) {
      return undefined;
    }
    const texto = valor.toString().trim();
    return texto.length ? texto : null;
  }
}
