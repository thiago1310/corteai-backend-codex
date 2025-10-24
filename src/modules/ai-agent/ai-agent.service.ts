import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RagService } from './services/rag.service';
import { BaseConhecimentoService } from './services/base-conhecimento.service';
import { EvolutionApiService } from './services/evolution-api.service';

import { PerguntarDto } from './dto/perguntar.dto';
import { TreinamentoDto } from './dto/treinamento.dto';
import { ContextoDto } from './dto/contexto.dto';
import { AtualizarConhecimentoDto, CriarConhecimentoDto } from './dto/conhecimento.dto';
import {
  ConfiguracaoAgenteDto,
  SalvarConfiguracaoAgenteDto,
} from './dto/configuracao-agente.dto';
import { AtualizarStatusEvolutionDto } from './dto/evolution-status.dto';

import { ChatHistoryEntity } from './entities/chat-history.entity';
import { ChatMessageEntity } from './entities/chat-message.entity';
import { DadosClienteEntity } from './entities/dados-cliente.entity';
import { ConexaoEvolutionEntity } from './entities/conexao-evolution.entity';
import { ConfiguracaoAgenteEntity } from './entities/configuracao-agente.entity';

@Injectable()
export class AiAgentService {
  constructor(
    private readonly ragService: RagService,
    private readonly baseConhecimento: BaseConhecimentoService,
    private readonly evolutionApi: EvolutionApiService,
    @InjectRepository(ChatHistoryEntity)
    private readonly historicoRepo: Repository<ChatHistoryEntity>,
    @InjectRepository(ChatMessageEntity)
    private readonly mensagensRepo: Repository<ChatMessageEntity>,
    @InjectRepository(DadosClienteEntity)
    private readonly dadosClienteRepo: Repository<DadosClienteEntity>,
    @InjectRepository(ConexaoEvolutionEntity)
    private readonly conexaoRepo: Repository<ConexaoEvolutionEntity>,
    @InjectRepository(ConfiguracaoAgenteEntity)
    private readonly configuracaoRepo: Repository<ConfiguracaoAgenteEntity>,
  ) { }

  async perguntar(dto: PerguntarDto) {
    const barbeariaId = this.exigirBarbeariaId(dto.barbeariaId);
    dto.barbeariaId = barbeariaId;

    await this.registrarHistorico('user', dto, barbeariaId);

    const respostaRag = await this.ragService.perguntar(dto.pergunta, barbeariaId);

    await this.registrarHistorico('assistant', dto, barbeariaId, respostaRag.resposta);
    await this.registrarMensagem(dto, barbeariaId, respostaRag.resposta);
    await this.atualizarCliente(dto, barbeariaId);

    const contextos = plainToInstance(ContextoDto, respostaRag.contextos, {
      excludeExtraneousValues: true,
    });

    return {
      resposta: respostaRag.resposta,
      contextos,
    };
  }

  async treinar(dto: TreinamentoDto) {
    const barbeariaId = this.exigirBarbeariaId(dto.barbeariaId);
    dto.barbeariaId = barbeariaId;

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
        barbeariaId,
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
    dto.barbeariaId = this.exigirBarbeariaId(dto.barbeariaId);
    return this.baseConhecimento.criar(dto);
  }

  atualizarConhecimento(id: string, barbeariaId: string, dto: AtualizarConhecimentoDto) {
    return this.baseConhecimento.atualizar(id, barbeariaId, dto);
  }

  removerConhecimento(id: string, barbeariaId: string) {
    return this.baseConhecimento.remover(id, barbeariaId);
  }

  async obterConfiguracaoAgente(barbeariaId: string): Promise<ConfiguracaoAgenteDto | null> {
    const configuracao = await this.configuracaoRepo.findOne({ where: { barbeariaId } });
    return configuracao ? this.mapearConfiguracao(configuracao) : null;
  }

  async salvarConfiguracaoAgente(
    barbeariaId: string,
    dto: SalvarConfiguracaoAgenteDto,
  ): Promise<ConfiguracaoAgenteDto> {
    let configuracao = await this.configuracaoRepo.findOne({ where: { barbeariaId } });

    if (!configuracao) {
      configuracao = this.configuracaoRepo.create({
        barbeariaId,
        nomeAgente: dto.nomeAgente,
        promptSistema: dto.promptSistema,
      });
    } else {
      configuracao.nomeAgente = dto.nomeAgente;
      configuracao.promptSistema = dto.promptSistema;
    }

    const salvo = await this.configuracaoRepo.save(configuracao);
    return this.mapearConfiguracao(salvo);
  }

  async atualizarStatusEvolutionViaToken(
    dto: AtualizarStatusEvolutionDto,
  ): Promise<{ barbeariaId: string }> {
    if (!dto.token || dto.token !== (process.env.EVOLUTION_API_KEY ?? '')) {
      throw new BadRequestException('Token invalido.');
    }

    const instanceNormalizada = dto.instanceName.trim();
    const conexao = await this.conexaoRepo.findOne({
      where: { instanceName: instanceNormalizada },
    });

    if (!conexao) {
      throw new BadRequestException('Instancia nao encontrada para o status informado.');
    }

    conexao.status = dto.status;
    await this.conexaoRepo.save(conexao);

    return { barbeariaId: conexao.barbeariaId };
  }

  async obterStatusEvolution(barbeariaId: string) {
    const conexao = await this.conexaoRepo.findOne({
      where: { barbeariaId },
    });

    if (!conexao) {
      return null;
    }

    return {
      id: conexao.id,
      status: conexao.status ?? null,
      updated_at: conexao.atualizadoEm,
      idbarbearia: conexao.barbeariaId,
      instanceName: conexao.instanceName,
    };
  }

  async criarSessaoEvolution(barbeariaId: string) {
    const instanceName = this.normalizarUsuarioId(barbeariaId);
    const resposta = await this.evolutionApi.criarSessao(instanceName);

    const registroExistente = await this.conexaoRepo.findOne({
      where: { barbeariaId },
    });

    const conexao =
      registroExistente ??
      this.conexaoRepo.create({
        barbeariaId,
        instanceName,
      });

    conexao.instanceName = instanceName;
    conexao.status = resposta.status ?? 'created';

    await this.conexaoRepo.save(conexao);

    return {
      conexao: {
        id: conexao.id,
        barbeariaId: conexao.barbeariaId,
        instanceName: conexao.instanceName,
        status: conexao.status,
        atualizadoEm: conexao.atualizadoEm,
      },
      qrcode: {
        code: resposta.qrcode?.code ?? null,
        base64: resposta.qrcode?.base64 ?? null,
      },
    };
  }

  async buscarSessaoEvolution(barbeariaId: string) {
    const conexao = await this.conexaoRepo.findOne({
      where: { barbeariaId },
    });

    if (!conexao) {
      return null;
    }

    let qrcode: { code: string | null; base64: string | null } | null = null;

    const estaConectado = this.conexaoEstabelecida(conexao.status);
    const ultimaAtualizacao = conexao.atualizadoEm
      ? new Date(conexao.atualizadoEm).getTime()
      : 0;

    if (!estaConectado) {
      const resposta = await this.evolutionApi.gerarQrcode(conexao.instanceName);
      qrcode = {
        code: resposta.code ?? null,
        base64: resposta.base64 ?? null,
      };

      const statusAlterado = resposta.status !== undefined && resposta.status !== conexao.status;
      if (statusAlterado) {
        conexao.status = resposta.status ?? conexao.status;
      }

      const deveSalvar = Date.now() - ultimaAtualizacao > 30_000 || statusAlterado;
      if (deveSalvar) {
        await this.conexaoRepo.save(conexao);
      }
    }

    return {
      id: conexao.id,
      barbeariaId: conexao.barbeariaId,
      instanceName: conexao.instanceName,
      status: conexao.status,
      atualizadoEm: conexao.atualizadoEm,
      code: qrcode?.code,
      base64: qrcode?.base64
    };
  }

  async obterDetalhesInstancia(barbeariaId: string) {
    const instanceName = this.normalizarUsuarioId(barbeariaId);
    const instancias = await this.evolutionApi.buscarInstancias();
    console.log('instancias', instancias)
    const detalhe = instancias.find(
      (item) =>

        item.instanceName.replace(/-/g, '').toLowerCase() === instanceName.replace(/-/g, '').toLowerCase(),
    );

    console.log('detalhes', detalhe);
    if (!detalhe) {
      return null;
    }

    const detalheRecord = detalhe as Record<string, unknown>;

    return {
      instanceName: detalhe.instanceName,
      numero: detalheRecord.owner ?? null,
      nome: detalheRecord.profileName ?? null,
      foto: detalheRecord.profilePictureUrl ?? null,
    };
  }

  async removerInstanciaEvolution(barbeariaId: string) {
    const conexao = await this.conexaoRepo.findOne({
      where: { barbeariaId },
    });

    if (!conexao) {
      throw new BadRequestException('Nenhuma instancia Evolution encontrada para esta barbearia.');
    }

    const instanceName = this.normalizarUsuarioId(conexao.instanceName ?? barbeariaId);
    await this.evolutionApi.deletarInstancia(instanceName);
    await this.conexaoRepo.delete({ id: conexao.id });

    return {
      removido: true,
      instanceName,
    };
  }

  async listarHistorico(barbeariaId: string, limite = 20) {
    const historico = await this.historicoRepo.find({
      where: { barbeariaId },
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
    barbeariaId: string,
    mensagem?: string,
  ) {
    const registro = this.historicoRepo.create({
      barbeariaId,
      telefoneBarbearia: dto.telefoneBarbearia ?? null,
      telefoneCliente: dto.telefoneCliente ?? null,
      role: papel,
      content: mensagem ?? dto.pergunta,
    });
    await this.historicoRepo.save(registro);
  }

  private async registrarMensagem(dto: PerguntarDto, barbeariaId: string, respostaBot: string) {
    const mensagem = this.mensagensRepo.create({
      barbeariaId,
      telefone: dto.telefoneCliente ?? null,
      nomeWhatsApp: dto.nomeCliente ?? null,
      mensagemBot: respostaBot,
      mensagemUsuario: dto.pergunta,
      tipoMensagem: 'rag',
    });
    await this.mensagensRepo.save(mensagem);
  }

  private async atualizarCliente(dto: PerguntarDto, barbeariaId: string) {
    if (!dto.telefoneCliente) {
      return;
    }

    const existente = await this.dadosClienteRepo.findOne({
      where: {
        barbeariaId,
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
      barbeariaId,
      telefone: dto.telefoneCliente,
      nomeWhatsApp: dto.nomeCliente ?? null,
      atendimentoIa: 'reativada',
    });
    await this.dadosClienteRepo.save(novo);
  }

  private normalizarUsuarioId(usuarioId: string) {
    return usuarioId.replace(/-/g, '');
  }

  private exigirBarbeariaId(id?: string): string {
    if (!id) {
      throw new BadRequestException('Identificador da barbearia nao fornecido.');
    }
    return id;
  }

  private conexaoEstabelecida(status?: string | null) {
    if (!status) {
      return false;
    }
    const normalizado = status.toString().toLowerCase();
    return normalizado === 'connected' || normalizado === 'open';
  }

  private mapearConfiguracao(config: ConfiguracaoAgenteEntity): ConfiguracaoAgenteDto {
    return {
      id: config.id,
      barbeariaId: config.barbeariaId,
      nomeAgente: config.nomeAgente,
      promptSistema: config.promptSistema,
      atualizadoEm: config.atualizadoEm,
    };
  }
}
