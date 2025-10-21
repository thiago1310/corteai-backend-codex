import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { RagService } from './services/rag.service';
import { PerguntarDto } from './dto/perguntar.dto';
import { TreinamentoDto } from './dto/treinamento.dto';
import { ContextoDto } from './dto/contexto.dto';
import {
  AtualizarConhecimentoDto,
  CriarConhecimentoDto,
} from './dto/conhecimento.dto';
import { BaseConhecimentoService } from './services/base-conhecimento.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatHistoryEntity } from './entities/chat-history.entity';
import { ChatMessageEntity } from './entities/chat-message.entity';
import { DadosClienteEntity } from './entities/dados-cliente.entity';

@Injectable()
export class AiAgentService {
  constructor(
    private readonly ragService: RagService,
    private readonly baseConhecimento: BaseConhecimentoService,
    @InjectRepository(ChatHistoryEntity)
    private readonly historicoRepo: Repository<ChatHistoryEntity>,
    @InjectRepository(ChatMessageEntity)
    private readonly mensagensRepo: Repository<ChatMessageEntity>,
    @InjectRepository(DadosClienteEntity)
    private readonly dadosClienteRepo: Repository<DadosClienteEntity>,
  ) {}

  async perguntar(dto: PerguntarDto) {
    await this.registrarHistorico('user', dto);

    const respostaRag = await this.ragService.perguntar(dto.pergunta, dto.barbeariaId);

    await this.registrarHistorico('assistant', dto, respostaRag.resposta);
    await this.registrarMensagem(dto, respostaRag.resposta);
    await this.atualizarCliente(dto);

    const contextos = plainToInstance(ContextoDto, respostaRag.contextos, {
      excludeExtraneousValues: true,
    });

    return {
      resposta: respostaRag.resposta,
      contextos,
    };
  }

  async treinar(dto: TreinamentoDto) {
    const registrosCriados: Record<string, unknown>[] = [];

    for (const registro of dto.registros) {
      const metadadosComOrigem =
        dto.origem || registro.metadados
          ? {
              ...(registro.metadados ?? {}),
              ...(dto.origem ? { origem: dto.origem } : {}),
            }
          : undefined;

      const conhecimento = await this.baseConhecimento.criar({
        barbeariaId: dto.barbeariaId,
        pergunta: registro.pergunta,
        resposta: registro.resposta,
        ativo: registro.ativo ?? true,
        metadados: metadadosComOrigem ?? null,
      });

      registrosCriados.push(conhecimento);
    }

    return {
      quantidade: registrosCriados.length,
      itens: registrosCriados,
    };
  }

  listarBaseConhecimento(barbeariaId: string) {
    return this.baseConhecimento.listar(barbeariaId);
  }

  criarConhecimento(dto: CriarConhecimentoDto) {
    return this.baseConhecimento.criar(dto);
  }

  atualizarConhecimento(id: string, barbeariaId: string, dto: AtualizarConhecimentoDto) {
    return this.baseConhecimento.atualizar(id, barbeariaId, dto);
  }

  removerConhecimento(id: string, barbeariaId: string) {
    return this.baseConhecimento.remover(id, barbeariaId);
  }

  async listarHistorico(limite = 20) {
    const historico = await this.historicoRepo.find({
      order: { createdAt: 'DESC' },
      take: limite,
    });

    return historico.map((item) => ({
      id: item.id,
      criadoEm: item.createdAt,
      barbeariaId: item.barbeariaId,
      telefoneBarbearia: item.telefoneBarbearia ?? null,
      telefoneCliente: item.telefoneCliente ?? null,
      papel: item.role,
      mensagem: item.content,
    }));
  }

  private async registrarHistorico(
    papel: 'user' | 'assistant',
    dto: PerguntarDto,
    mensagem?: string,
  ) {
    const registro = this.historicoRepo.create({
      barbeariaId: dto.barbeariaId,
      telefoneBarbearia: dto.telefoneBarbearia ?? null,
      telefoneCliente: dto.telefoneCliente ?? null,
      role: papel,
      content: mensagem ?? dto.pergunta,
    });
    await this.historicoRepo.save(registro);
  }

  private async registrarMensagem(dto: PerguntarDto, respostaBot: string) {
    const mensagem = this.mensagensRepo.create({
      barbeariaId: dto.barbeariaId,
      telefone: dto.telefoneCliente ?? null,
      nomeWhatsApp: dto.nomeCliente ?? null,
      mensagemBot: respostaBot,
      mensagemUsuario: dto.pergunta,
      tipoMensagem: 'rag',
    });
    await this.mensagensRepo.save(mensagem);
  }

  private async atualizarCliente(dto: PerguntarDto) {
    if (!dto.telefoneCliente) {
      return;
    }

    const existente = await this.dadosClienteRepo.findOne({
      where: {
        barbeariaId: dto.barbeariaId,
        telefone: dto.telefoneCliente,
      },
    });

    if (existente) {
      existente.nomeWhatsApp = dto.nomeCliente ?? existente.nomeWhatsApp;
      existente.atendimentoIa = 'reativada';
      await this.dadosClienteRepo.save(existente);
      return;
    }

    const novo = this.dadosClienteRepo.create({
      barbeariaId: dto.barbeariaId,
      telefone: dto.telefoneCliente,
      nomeWhatsApp: dto.nomeCliente ?? null,
      atendimentoIa: 'reativada',
    });
    await this.dadosClienteRepo.save(novo);
  }
}
