import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
import { BarbeariaEntity } from '../barbearias/barbearias.entity';

import { ChatStatusEntity } from './entities/chat-status.entity';
import { UpsertChatStatusDto, GetChatStatusDto } from './dto/chat-status.dto';
import { ClienteEntity } from '../clientes/clientes.entity';
import { BuscarChatExternoDto } from './dto/buscar-chat-externo.dto';
import { RegistrarChatExternoDto } from './dto/registrar-chat-externo.dto';
import { DEFAULT_AGENT_NAME, DEFAULT_AGENT_PROMPT } from './ai-agent.constants';
import { ConsultarBarbeariaWebhookDto } from './dto/consultar-barbearia-webhook.dto';
import { EvolutionWebhookDto } from './dto/evolution-webhook.dto';
import { WhatsappMessageMappingEntity } from './entities/whatsapp-message-mapping.entity';

@Injectable()
export class AiAgentService {
  constructor(
    private readonly ragService: RagService,
    private readonly baseConhecimento: BaseConhecimentoService,
    private readonly evolutionApi: EvolutionApiService,
    @InjectRepository(ChatHistoryEntity)
    private readonly historicoRepo: Repository<ChatHistoryEntity>,
    @InjectRepository(ClienteEntity)
    private readonly clienteRepo: Repository<ClienteEntity>,
    @InjectRepository(ChatMessageEntity)
    private readonly mensagensRepo: Repository<ChatMessageEntity>,
    @InjectRepository(DadosClienteEntity)
    private readonly dadosClienteRepo: Repository<DadosClienteEntity>,
    @InjectRepository(ConexaoEvolutionEntity)
    private readonly conexaoRepo: Repository<ConexaoEvolutionEntity>,
    @InjectRepository(ConfiguracaoAgenteEntity)
    private readonly configuracaoRepo: Repository<ConfiguracaoAgenteEntity>,
    @InjectRepository(BarbeariaEntity)
    private readonly barbeariaRepo: Repository<BarbeariaEntity>,
    @InjectRepository(ChatStatusEntity)
    private readonly chatStatusRepo: Repository<ChatStatusEntity>,
    @InjectRepository(WhatsappMessageMappingEntity)
    private readonly whatsappMappingRepo: Repository<WhatsappMessageMappingEntity>,
  ) { }

  async perguntar(dto: PerguntarDto) {
    await this.definirBarbeariaViaTelefone(dto);
    const barbeariaId = this.exigirBarbeariaId(dto.barbeariaId);
    dto.barbeariaId = barbeariaId;

    // Historico nao e mais persistido aqui; processo externo (n8n) cuidara disso.

    const respostaRag = await this.ragService.perguntar(dto.pergunta, barbeariaId);

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

  async obterConfiguracaoAgente(barbeariaId: string): Promise<ConfiguracaoAgenteDto> {
    let configuracao = await this.configuracaoRepo.findOne({ where: { barbeariaId } });
    if (!configuracao) {
      configuracao = this.configuracaoRepo.create({ barbeariaId });
      this.aplicarValoresConfiguracao(configuracao, this.obterConfiguracaoPadraoValores());
      configuracao = await this.configuracaoRepo.save(configuracao);
    }

    return this.mapearConfiguracao(configuracao);
  }

  async salvarConfiguracaoAgente(
    barbeariaId: string,
    dto: SalvarConfiguracaoAgenteDto,
  ): Promise<ConfiguracaoAgenteDto> {
    let configuracao = await this.configuracaoRepo.findOne({ where: { barbeariaId } });

    if (!configuracao) {
      configuracao = this.configuracaoRepo.create({ barbeariaId });
    }

    this.aplicarValoresConfiguracao(configuracao, dto);

    const salvo = await this.configuracaoRepo.save(configuracao);
    return this.mapearConfiguracao(salvo);
  }

  async resetarConfiguracaoAgente(barbeariaId: string): Promise<ConfiguracaoAgenteDto> {
    return this.salvarConfiguracaoAgente(barbeariaId, this.obterConfiguracaoPadraoValores());
  }

  async consultarBarbeariaViaWebhook(dto: ConsultarBarbeariaWebhookDto) {
    this.validarToken(dto.token);

    const barbearia = await this.barbeariaRepo.findOne({ where: { id: dto.barbeariaId } });
    if (!barbearia) {
      throw new BadRequestException('Barbearia nao encontrada.');
    }

    const configuracao = await this.obterConfiguracaoAgente(barbearia.id);

    return {
      barbearia: this.mapearBarbeariaParaWebhook(barbearia),
      configuracaoAgente: configuracao,
    };
  }

  async processarEvolutionWebhook(dto) {
    this.validarToken(dto.token);
    const instanceExtraida = this.extrairInstance(dto);

    if (!instanceExtraida) {
      throw new BadRequestException('Instance nao informada no webhook.');
    }

    const instanceNormalizada = this.normalizarInstance(instanceExtraida);

    const conexao = await this.resolverConexaoPorInstance(instanceNormalizada, instanceExtraida);

    if (!conexao) {
      throw new BadRequestException('Instancia Evolution nao encontrada.');
    }

    const barbeariaId = conexao.barbeariaId;


    const evento = dto.body?.event ?? dto.message?.event ?? null;
    const eventoLower = evento?.toLowerCase() ?? '';


    let statusConexao = conexao.status ?? null;

    if (eventoLower === 'connection.update') {
      const novoStatus = this.extrairStatusDaConexao(dto);
      if (novoStatus && novoStatus !== conexao.status) {
        conexao.status = novoStatus;
        await this.conexaoRepo.save(conexao);
        statusConexao = novoStatus;
      }

      return {
        evento,
        direcao: null,
        barbeariaId,
        cliente: null,
        mensagem: null,
        statusConexao,
        chatStatus: null,
        historico: [],
      };
    }

    const telefone = await this.resolverTelefoneCliente(barbeariaId, dto);

    if (!telefone) {
      return {
        ignorado: true,
        motivo: 'telefone_nao_resolvido',
        evento,
        barbeariaId,
      };
    }

    const cliente = await this.sincronizarClienteEvolution(barbeariaId, telefone, dto);

    const mensagemProcessada = await this.processarMensagemEvolution(
      barbeariaId,
      cliente,
      telefone,
      dto,
    );

    const historicoRegistros = await this.historicoRepo.find({
      where: {
        barbeariaId,
        telefoneCliente: telefone,
      },
      order: { createdAt: 'DESC' },
      take: 40,
    });
    const historico = historicoRegistros
      .reverse()
      .map((registro) => ({
        messageId: registro.messageId,
        role: registro.role,
        content: registro.content,
        createdAt: registro.createdAt,
      }));

    const chatStatusRegistro = await this.atualizarStatusConversa(cliente.id, mensagemProcessada);

    return {
      evento,
      direcao: mensagemProcessada?.direcao ?? null,
      barbeariaId,
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        telefone: cliente.telefone,
      },
      mensagem: mensagemProcessada,
      statusConexao,
      chatStatus: chatStatusRegistro?.status ?? 1,
      historico,
    };
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

    const detalhe = instancias.find(
      (item) =>

        item.instanceName.replace(/-/g, '').toLowerCase() === instanceName.replace(/-/g, '').toLowerCase(),
    );

;
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

  private extrairInstance(dto: EvolutionWebhookDto): string | null {
    const candidatos = [
      dto.body?.Instance,
      dto.body?.instance,
      dto.body?.InstanceName,
    ];

    const data = (dto.body?.data as Record<string, unknown> | undefined) ?? undefined;
    if (data) {
      const possiveis = [
        data.instanceName,
        data.instance,
        data.Instance,
      ];
      for (const valor of possiveis) {
        if (typeof valor === 'string' && valor.trim()) {
          candidatos.push(valor);
        }
      }
    }

    return (
      candidatos.find((valor) => typeof valor === 'string' && valor.trim().length) ?? null
    );
  }

  private normalizarInstance(instance: string) {
    return instance.replace(/\s+/g, '').replace(/-/g, '');
  }

  private async resolverConexaoPorInstance(instanceNormalizada: string, original?: string) {
    if (original) {
      const conexaoDireta = await this.conexaoRepo.findOne({
        where: { instanceName: original },
      });
      if (conexaoDireta) {
        return conexaoDireta;
      }
    }

    const conexaoPadrao = await this.conexaoRepo.findOne({
      where: { instanceName: instanceNormalizada },
    });
    if (conexaoPadrao) {
      return conexaoPadrao;
    }

    return this.conexaoRepo
      .createQueryBuilder('conexao')
      .where('LOWER(REPLACE(conexao.instanceName, \'-\', \'\')) = :instance', {
        instance: instanceNormalizada.toLowerCase(),
      })
      .getOne();
  }

  private async resolverTelefoneCliente(barbeariaId: string, dto: EvolutionWebhookDto) {
    const data = dto.body?.data ?? {};
    const key = (data as Record<string, unknown>)?.key as Record<string, unknown> | undefined;

    const candidatos: Array<unknown> = [
      key?.remoteJid,
      dto.body?.sender,
      key?.participant,
      (data as Record<string, unknown>)?.telefone,
      (data as Record<string, unknown>)?.Telefone,
    ];

    for (const candidato of candidatos) {
      const telefone = this.extrairTelefoneDeValor(candidato);
      if (telefone && !this.ehTelefonePlaceholder(telefone)) {
        return this.normalizarTelefoneCliente(telefone);
      }
    }

    const stanzaId = this.extrairStanzaId(dto);
    if (stanzaId) {
      const telefoneStanza = await this.buscarTelefonePorStanza(barbeariaId, stanzaId);
      if (telefoneStanza) {
        return this.normalizarTelefoneCliente(telefoneStanza);
      }
    }

    const messageId = this.extrairMessageId(dto);
    if (messageId) {
      const telefoneSalvo = await this.buscarTelefoneViaMessageId(barbeariaId, messageId);
      if (telefoneSalvo && !this.ehTelefonePlaceholder(telefoneSalvo)) {
        return this.normalizarTelefoneCliente(telefoneSalvo);
      }
      const telefoneMapeado = await this.buscarTelefonePorStanza(barbeariaId, messageId);
      if (telefoneMapeado) {
        return this.normalizarTelefoneCliente(telefoneMapeado);
      }
    }

    return null;
  }

  private extrairTelefoneDeValor(valor?: unknown): string | null {
    if (!valor) {
      return null;
    }
    if (typeof valor === 'string') {
      return valor;
    }
    if (typeof valor === 'number') {
      return valor.toString();
    }
    return null;
  }

  private async buscarTelefoneViaMessageId(barbeariaId: string, messageId?: string | null) {
    if (!messageId) {
      return null;
    }
    const id = messageId.toString().trim();
    if (!id) {
      return null;
    }
    const registro = await this.historicoRepo.findOne({
      where: { barbeariaId, messageId: id },
    });
    return registro?.telefoneCliente ?? null;
  }

  private extrairMessageId(dto: EvolutionWebhookDto) {
    const data = (dto.body?.data as Record<string, unknown> | undefined) ?? undefined;
    const key =
      (dto.body?.key as Record<string, unknown> | undefined) ??
      ((data?.key as Record<string, unknown>) || undefined);

    const candidatos = [dto.body?.messageId, dto.messageId, key?.id];

    for (const valor of candidatos) {
      if (typeof valor === 'string') {
        const texto = valor.trim();
        if (texto.length) {
          return texto;
        }
      }
    }

    return null;
  }

  private extrairStanzaId(dto: EvolutionWebhookDto) {
    const data = (dto.body?.data as Record<string, unknown> | undefined) ?? undefined;
    const mensagem = (data?.message as Record<string, unknown> | undefined) ?? undefined;
    const extended =
      (mensagem?.extendedTextMessage as Record<string, unknown> | undefined) ?? undefined;
    const context =
      (extended?.contextInfo as Record<string, unknown> | undefined) ?? undefined;

    const candidatos = [
      context?.stanzaId,
      context?.stanzaid,
      context?.quotedStanzaID,
      context?.stanzaID,
    ];

    for (const valor of candidatos) {
      if (typeof valor === 'string') {
        const texto = valor.trim();
        if (texto.length) {
          return texto;
        }
      }
    }

    return null;
  }

  private async buscarTelefonePorStanza(barbeariaId: string, stanzaId?: string | null) {
    if (!stanzaId) {
      return null;
    }
    const id = stanzaId.toString().trim();
    if (!id) {
      return null;
    }
    const mapping = await this.whatsappMappingRepo.findOne({
      where: { barbeariaId, stanzaId: id },
    });
    return mapping?.telefone ?? null;
  }

  private async sincronizarClienteEvolution(
    barbeariaId: string,
    telefone: string,
    dto: EvolutionWebhookDto,
  ) {
    let cliente = await this.clienteRepo.findOne({
      where: { barbeariaId, telefone },
    });

    const nome = this.sanitizarTexto(dto.body?.NomeWhatsapp ?? dto.body?.nome);

    if (!cliente) {
      cliente = this.clienteRepo.create({
        barbeariaId,
        telefone,
        nome: nome ?? null,
      });
    } else if (nome) {
      cliente.nome = cliente.nome ? cliente.nome : nome;
    }

    return this.clienteRepo.save(cliente);
  }

  private async processarMensagemEvolution(
    barbeariaId: string,
    cliente: ClienteEntity,
    telefone: string,
    dto: EvolutionWebhookDto,
  ) {
    const evento = dto.body?.event ?? dto.message?.event ?? '';
    const possuiConteudo =
      (typeof dto.message?.content === 'string' && dto.message.content.length > 0) ||
      typeof this.extrairConteudoMensagem(dto) === 'string';

    if (!evento.toLowerCase().includes('message') && !possuiConteudo) {
      return null;
    }

    const conteudo = this.extrairConteudoMensagem(dto) ?? '';
    const messageId = this.extrairMessageId(dto);
    const fromMe = this.mensagemPartiuDaBarbearia(dto);
    const direcao = fromMe ? 'saindo' : 'entrando';
    const role: 'user' | 'assistant' = fromMe ? 'assistant' : 'user';
    const timestamp = this.extrairTimestamp(dto);

    if (messageId) {
      await this.registrarTelefonePorMessageId(barbeariaId, telefone, messageId);
      const existente = await this.historicoRepo.findOne({
        where: { barbeariaId, messageId },
      });
      if (existente) {
        return {
          id: messageId,
          conteudo,
          direcao,
          role,
          timestamp,
        };
      }
    }

    const registro = this.historicoRepo.create({
      barbeariaId,
      telefoneCliente: telefone,
      telefoneBarbearia: null,
      role,
      content: conteudo,
      ...(messageId ? { messageId } : {}),
    });
    await this.historicoRepo.save(registro);
    const idParaMapeamento = messageId ?? registro.messageId ?? registro.id.toString();
    await this.registrarTelefonePorMessageId(barbeariaId, telefone, idParaMapeamento);

    return {
      id: messageId ?? registro.id,
      conteudo,
      direcao,
      role,
      timestamp,
    };
  }

  private mensagemPartiuDaBarbearia(dto: EvolutionWebhookDto) {
    const data = (dto.body?.data as Record<string, unknown> | undefined) ?? undefined;
    const key =
      (dto.body?.key as Record<string, unknown> | undefined) ??
      ((data?.key as Record<string, unknown>) || undefined);

    if (key && typeof key.fromMe === 'boolean') {
      return key.fromMe;
    }

    const evento = dto.message?.event?.toLowerCase();
    if (evento) {
      return evento === 'outgoing' || evento === 'outcoming';
    }

    return false;
  }

  private extrairConteudoMensagem(dto: EvolutionWebhookDto): string | null {
    if (dto.message?.content) {
      return dto.message.content;
    }

    const data = (dto.body?.data as Record<string, unknown> | undefined) ?? undefined;
    const mensagem = (data?.message as Record<string, unknown> | undefined) ?? undefined;
    if (!mensagem) {
      return null;
    }

    const candidatos = [
      mensagem.conversation,
      mensagem.text,
      mensagem.body,
    ];

    for (const valor of candidatos) {
      if (typeof valor === 'string' && valor.trim().length) {
        return valor;
      }
    }

    return null;
  }

  private extrairTimestamp(dto: EvolutionWebhookDto): Date | null {
    const candidatos: Array<unknown> = [
      dto.message?.timestamp,
    ];

    const data = (dto.body?.data as Record<string, unknown> | undefined) ?? undefined;
    if (data) {
      candidatos.push(data.timestamp);
      candidatos.push(data.messageTimestamp);
    }

    for (const valor of candidatos) {
      const dataConvertida = this.converterParaData(valor);
      if (dataConvertida) {
        return dataConvertida;
      }
    }

    return null;
  }

  private converterParaData(valor: unknown): Date | null {
    if (!valor) {
      return null;
    }
    if (valor instanceof Date) {
      return valor;
    }
    if (typeof valor === 'number') {
      return new Date(valor);
    }
    if (typeof valor === 'string') {
      if (!valor.trim()) {
        return null;
      }
      const somenteNumeros = /^\d+$/.test(valor);
      if (somenteNumeros) {
        const numero = Number(valor);
        if (!Number.isNaN(numero)) {
          return numero > 1_000_000_000_000 ? new Date(numero) : new Date(numero * 1000);
        }
      }
      const data = new Date(valor);
      return Number.isNaN(data.getTime()) ? null : data;
    }
    return null;
  }

  private extrairStatusDaConexao(dto: EvolutionWebhookDto): string | null {
    const data = (dto.body?.data as Record<string, unknown> | undefined) ?? undefined;
    if (!data) {
      return null;
    }

    const candidatos = [data.state, data.status, data.connectionState, data.connectionStatus];
    const encontrado = candidatos.find((valor) => typeof valor === 'string' && valor.trim().length);
    return encontrado ? String(encontrado) : null;
  }

  private async atualizarStatusConversa(
    clienteId: string,
    mensagem?: { direcao: string | null } | null,
  ) {
    let status = await this.chatStatusRepo.findOne({
      where: { clienteId },
    });

    if (!status) {
      status = this.chatStatusRepo.create({
        clienteId,
        status: 1,
        metadados: null,
      });
    }

    if (mensagem?.direcao === 'entrando') {
      status.status = 1;
    }

    const metadadosAtual =
      (status.metadados as Record<string, unknown> | null) ?? {};
    const ultimaDirecaoAnterior =
      metadadosAtual && typeof (metadadosAtual as any).ultimaDirecao === 'string'
        ? ((metadadosAtual as any).ultimaDirecao as string)
        : null;

    status.metadados = {
      ...metadadosAtual,
      ultimaDirecao: mensagem?.direcao ?? ultimaDirecaoAnterior,
    };

    return this.chatStatusRepo.save(status);
  }

  private async registrarTelefonePorMessageId(
    barbeariaId: string,
    telefone: string,
    messageId?: string | null,
  ) {
    if (!messageId) {
      return;
    }
    const id = messageId.toString().trim();
    if (!id) {
      return;
    }

    const telefoneNormalizado = this.normalizarTelefoneCliente(telefone);
    let mapping = await this.whatsappMappingRepo.findOne({
      where: { barbeariaId, stanzaId: id },
    });

    if (!mapping) {
      mapping = this.whatsappMappingRepo.create({
        barbeariaId,
        stanzaId: id,
        messageId: id,
        telefone: telefoneNormalizado,
      });
    } else {
      mapping.telefone = telefoneNormalizado;
      if (!mapping.messageId) {
        mapping.messageId = id;
      }
    }

    await this.whatsappMappingRepo.save(mapping);
  }

  private normalizarTelefoneCliente(telefone: string) {
    const apenasDigitos = telefone.replace(/\D/g, '');
    return apenasDigitos || telefone.replace(/\s+/g, '');
  }

  private ehTelefonePlaceholder(telefone: string) {
    const valor = telefone.toLowerCase();
    if (valor.includes('@s.whatsapp.net')) {
      return false;
    }
    if (valor.includes('@lid')) {
      return true;
    }
    return valor.includes('@');
  }

  private sanitizarTexto(texto?: string | null) {
    if (texto === undefined || texto === null) {
      return undefined;
    }
    const valor = texto.toString().trim();
    return valor.length ? valor : undefined;
  }

  private obterConfiguracaoPadraoValores(): Pick<
    ConfiguracaoAgenteEntity,
    'nomeAgente' | 'promptSistema'
  > {
    return {
      nomeAgente: DEFAULT_AGENT_NAME,
      promptSistema: DEFAULT_AGENT_PROMPT,
    };
  }

  private aplicarValoresConfiguracao(
    config: ConfiguracaoAgenteEntity,
    valores: Pick<ConfiguracaoAgenteEntity, 'nomeAgente' | 'promptSistema'>,
  ) {
    config.nomeAgente = valores.nomeAgente;
    config.promptSistema = valores.promptSistema;
  }

  private mapearBarbeariaParaWebhook(barbearia: BarbeariaEntity) {
    return {
      id: barbearia.id,
      nome: barbearia.nome,
      telefone: barbearia.telefone ?? null,
      link: barbearia.link,
      statusAberto: barbearia.statusAberto,
    };
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

  private async definirBarbeariaViaTelefone(dto: PerguntarDto) {
    if (dto.barbeariaId) {
      return;
    }

    if (!dto.telefoneBarbearia) {
      throw new BadRequestException('Telefone da barbearia obrigatorio quando o token e utilizado.');
    }

    const telefoneNormalizado = this.normalizarTelefone(dto.telefoneBarbearia);
    const barbearia = await this.barbeariaRepo
      .createQueryBuilder('barbearia')
      .where("regexp_replace(barbearia.telefone, '\\D', '', 'g') = :telefone", {
        telefone: telefoneNormalizado,
      })
      .getOne();

    if (!barbearia) {
      throw new BadRequestException('Barbearia nao encontrada para o telefone informado.');
    }

    dto.barbeariaId = barbearia.id;
  }

  private normalizarTelefone(valor: string) {
    const somenteDigitos = valor.replace(/\D/g, '');
    if (!somenteDigitos) {
      throw new BadRequestException('Telefone informado e invalido.');
    }
    return somenteDigitos;
  }


  async BuscarChatExterno(dto: BuscarChatExternoDto) {
    const chat = await this.historicoRepo.findOne({ where: { messageId: dto.messageId } });
    if (!chat) throw new NotFoundException('MessageId não encontrado.');
    return chat;
  }


  async registrarChatExterno(dto: RegistrarChatExternoDto) {
    const barbeariaId = await this.resolverBarbeariaId(dto.barbeariaId, dto.telefoneBarbearia);
    await this.historicoRepo.save(
      this.historicoRepo.create({
        barbeariaId,
        telefoneBarbearia: dto.telefoneBarbearia ?? null,
        telefoneCliente: dto.telefoneCliente ?? null,
        messageId: dto.messageId,
        role: dto.role,
        content: dto.content,
      }),
    );

    if (dto.role === 'assistant') {
      const payload: PerguntarDto = {
        token: dto.token,
        pergunta: dto.content,
        barbeariaId,
      };
      if (dto.telefoneCliente) {
        payload.telefoneCliente = dto.telefoneCliente;
      }
      if (dto.telefoneBarbearia) {
        payload.telefoneBarbearia = dto.telefoneBarbearia;
      }

      await this.registrarMensagem(payload, barbeariaId, dto.content);
    }

    return { registrado: true };
  }

  private async resolverBarbeariaId(id?: string, telefone?: string) {
    if (id) {
      return id;
    }
    if (!telefone) {
      throw new BadRequestException('Informe o telefone da barbearia ou o barbeariaId.');
    }
    const telefoneNormalizado = this.normalizarTelefone(telefone);
    const barbearia = await this.barbeariaRepo
      .createQueryBuilder('barbearia')
      .where("regexp_replace(barbearia.telefone, '\\D', '', 'g') = :telefone", {
        telefone: telefoneNormalizado,
      })
      .getOne();
    if (!barbearia) {
      throw new BadRequestException('Barbearia nao encontrada para o telefone informado.');
    }
    return barbearia.id;
  }

  async upsertChatStatus(dto: UpsertChatStatusDto) {
    this.validarToken(dto.token);

    let clientExist = await this.clienteRepo.findOne({ where: { id: dto.clienteId } });
    if (!clientExist) throw new NotFoundException('Cliente não encontrado.')

    let status = await this.chatStatusRepo.findOne({
      where: { clienteId: dto.clienteId },
    });

    if (!status) {
      status = this.chatStatusRepo.create({
        clienteId: dto.clienteId,
        status: dto.status,
        metadados: dto.metadados ?? null,
      });
    } else {
      status.status = dto.status;
      status.metadados = dto.metadados ?? null;
    }

    const salvo = await this.chatStatusRepo.save(status);
    return salvo;
  }

  async obterChatStatus(dto: GetChatStatusDto) {
    this.validarToken(dto.token);

    let clientExist = await this.clienteRepo.findOne({ where: { id: dto.clienteId } });
    if (!clientExist) throw new NotFoundException('Cliente não encontrado.')

    let status = await this.chatStatusRepo.findOne({
      where: { clienteId: dto.clienteId },
    });

    if (!status) {
      status = this.chatStatusRepo.create({
        clienteId: dto.clienteId,
        status: 1,
        metadados: null,
      });
      status = await this.chatStatusRepo.save(status);
    }

    return status;
  }

  private validarToken(token?: string) {
    const esperado = process.env.CLIENTES_WEBHOOK_TOKEN ?? '';
    if (!token || !esperado || token !== esperado) {
      throw new BadRequestException('Token invalido.');
    }
  }
}
