import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClienteEntity } from '../clientes/clientes.entity';
import { DEFAULT_AGENT_NAME, DEFAULT_AGENT_PROMPT, DEFAULT_WELCOME_MESSAGE } from './ai-agent.constants';
import { AtualizarDadosImportantesDto, CriarConversaDto, RenovarTokenConversaDto, ResponderConversaDto } from './dto/conversa.dto';
import { SalvarConfiguracaoAgenteDto } from './dto/configuracao-agente.dto';
import { AtualizarDocumentoDto, CriarDocumentoDto } from './dto/documento.dto';
import { CriarMensagemDto } from './dto/mensagem.dto';
import { ConfiguracaoAgenteEntity } from './entities/configuracao-agente.entity';
import { ConversaEntity } from './entities/conversa.entity';
import { DocumentoEntity } from './entities/document.entity';
import { MensagemEntity } from './entities/mensagem.entity';
import { DocumentosService } from './services/documentos.service';
import { LimiteRequisicoesService } from './services/limite-requisicoes.service';
import { RagService } from './services/rag.service';

interface PayloadTokenConversa {
  conversaId: string;
  clienteId: string;
  tipo: 'conversa';
}

@Injectable()
export class AiAgentService {
  // Service central que orquestra conversa, persistencia e chamada ao RAG.
  private readonly logger = new Logger(AiAgentService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly documentosService: DocumentosService,
    private readonly ragService: RagService,
    private readonly limiteRequisicoesService: LimiteRequisicoesService,
    @InjectRepository(ConfiguracaoAgenteEntity)
    private readonly configuracaoRepo: Repository<ConfiguracaoAgenteEntity>,
    @InjectRepository(ConversaEntity)
    private readonly conversaRepo: Repository<ConversaEntity>,
    @InjectRepository(MensagemEntity)
    private readonly mensagemRepo: Repository<MensagemEntity>,
    @InjectRepository(ClienteEntity)
    private readonly clienteRepo: Repository<ClienteEntity>,
    @InjectRepository(DocumentoEntity)
    private readonly documentoRepo: Repository<DocumentoEntity>,
  ) {}

  listarDocumentos(clienteId: string) {
    return this.documentosService.listar(clienteId);
  }

  criarDocumento(clienteId: string, dto: CriarDocumentoDto) {
    return this.documentosService.criar(clienteId, dto);
  }

  atualizarDocumento(id: string, clienteId: string, dto: AtualizarDocumentoDto) {
    return this.documentosService.atualizar(id, clienteId, dto);
  }

  removerDocumento(id: string, clienteId: string) {
    return this.documentosService.remover(id, clienteId);
  }

  async obterConfiguracaoAgente(clienteId: string) {
    this.logger.log(`Obtendo configuracao do agente cliente=${clienteId}`);
    return this.garantirConfiguracao(clienteId);
  }

  async salvarConfiguracaoAgente(clienteId: string, dto: SalvarConfiguracaoAgenteDto) {
    this.logger.log(`Salvando configuracao do agente cliente=${clienteId}`);
    const configuracao = await this.garantirConfiguracao(clienteId);
    configuracao.nomeAgente = dto.nomeAgente ?? configuracao.nomeAgente;
    configuracao.mensagemBoasVindas = dto.mensagemBoasVindas ?? configuracao.mensagemBoasVindas;
    configuracao.promptSistema = dto.promptSistema ?? configuracao.promptSistema;
    configuracao.tomResposta = dto.tomResposta ?? configuracao.tomResposta;
    configuracao.instrucoesExtras = dto.instrucoesExtras ?? configuracao.instrucoesExtras;
    configuracao.limiteMaximoMensagensPorConversa =
      dto.limiteMaximoMensagensPorConversa ?? configuracao.limiteMaximoMensagensPorConversa;
    configuracao.ativo = dto.ativo ?? configuracao.ativo;
    return this.configuracaoRepo.save(configuracao);
  }

  async criarConversa(dto: CriarConversaDto, identificadorOrigem: string) {
    // Inicia uma nova sessao publica de conversa para o cliente informado.
    this.logger.log(`Iniciando criacao de conversa cliente=${dto.clienteId} origem=${identificadorOrigem}`);
    await this.garantirCliente(dto.clienteId);
    const configuracao = await this.garantirConfiguracao(dto.clienteId);

    if (!configuracao.ativo) {
      return {
        ativo: false,
        nomeAgente: configuracao.nomeAgente,
        mensagemBoasVindas: null,
      };
    }

    this.validarLimiteCriacaoConversa(dto.clienteId, identificadorOrigem);

    const conversa = await this.conversaRepo.save(
      this.conversaRepo.create({
        clienteId: dto.clienteId,
        dadosImportantes: null,
        status: 'ativa',
        canal: 'site',
        origem: 'widget',
      }),
    );
    this.logger.log(`Conversa criada conversa=${conversa.id} cliente=${dto.clienteId}`);
    return {
      ativo: true,
      conversaId: conversa.id,
      tokenConversa: await this.gerarTokenConversa(conversa.id, dto.clienteId),
      nomeAgente: configuracao.nomeAgente,
      mensagemBoasVindas: configuracao.mensagemBoasVindas ?? DEFAULT_WELCOME_MESSAGE,
    };
  }

  async renovarTokenConversa(dto: RenovarTokenConversaDto, _identificadorOrigem?: string) {
    // Restaura a sessao publica da conversa sem expor o id real ao navegador.
    this.logger.log('Renovando token de conversa');
    const payload = await this.validarTokenConversa(dto.tokenConversa);
    const conversa = await this.buscarConversaOuErro(payload.conversaId, payload.clienteId);
    const configuracao = await this.garantirConfiguracao(conversa.clienteId);

    if (!configuracao.ativo) {
      return {
        ativo: false,
        nomeAgente: configuracao.nomeAgente,
        historico: [],
      };
    }

    return {
      ativo: true,
      tokenConversa: await this.gerarTokenConversa(conversa.id, conversa.clienteId),
      nomeAgente: configuracao.nomeAgente,
      historico: await this.listarMensagensConversa(conversa.id, conversa.clienteId),
    };
  }

  async obterConversa(id: string, clienteId: string) {
    return this.buscarConversaOuErro(id, clienteId);
  }

  async listarConversas(clienteId: string) {
    this.logger.log(`Listando conversas cliente=${clienteId}`);
    await this.garantirCliente(clienteId);

    const conversas = await this.conversaRepo.find({
      where: { clienteId },
      order: { atualizadoEm: 'DESC' },
    });

    if (!conversas.length) {
      return [];
    }

    const conversaIds = conversas.map((item) => item.id);
    const mensagens = await this.mensagemRepo.find({
      where: { clienteId },
      order: { criadoEm: 'DESC' },
    });

    const resumoPorConversa = new Map<
      string,
      {
        ultimaMensagem: string | null;
        ultimaMensagemEm: Date | null;
        ultimaMensagemPapel: string | null;
        totalMensagens: number;
      }
    >();

    for (const mensagem of mensagens) {
      if (!conversaIds.includes(mensagem.conversaId)) {
        continue;
      }

      const atual = resumoPorConversa.get(mensagem.conversaId);
      if (!atual) {
        resumoPorConversa.set(mensagem.conversaId, {
          ultimaMensagem: mensagem.mensagem,
          ultimaMensagemEm: mensagem.criadoEm,
          ultimaMensagemPapel: mensagem.papel,
          totalMensagens: 1,
        });
        continue;
      }

      atual.totalMensagens += 1;
      resumoPorConversa.set(mensagem.conversaId, atual);
    }

    return conversas.map((conversa) => {
      const resumo = resumoPorConversa.get(conversa.id);
      return {
        id: conversa.id,
        clienteId: conversa.clienteId,
        status: conversa.status,
        canal: conversa.canal,
        origem: conversa.origem,
        dadosImportantes: conversa.dadosImportantes ?? null,
        criadoEm: conversa.criadoEm,
        atualizadoEm: conversa.atualizadoEm,
        ultimaMensagem: resumo?.ultimaMensagem ?? null,
        ultimaMensagemEm: resumo?.ultimaMensagemEm ?? null,
        ultimaMensagemPapel: resumo?.ultimaMensagemPapel ?? null,
        totalMensagens: resumo?.totalMensagens ?? 0,
      };
    });
  }

  async atualizarDadosImportantes(id: string, clienteId: string, dto: AtualizarDadosImportantesDto) {
    this.logger.log(`Atualizando dados importantes conversa=${id} cliente=${clienteId}`);
    const conversa = await this.buscarConversaOuErro(id, clienteId);
    conversa.dadosImportantes = dto.dadosImportantes ?? null;
    return this.conversaRepo.save(conversa);
  }

  async criarMensagem(dto: CriarMensagemDto, identificadorOrigem: string) {
    // Persiste apenas mensagem do usuario a partir do endpoint publico.
    this.logger.log(`Recebendo mensagem publica origem=${identificadorOrigem}`);
    const payload = await this.validarTokenConversa(dto.tokenConversa);
    await this.buscarConversaOuErro(payload.conversaId, payload.clienteId);
    const configuracao = await this.validarAgenteAtivo(payload.clienteId);
    this.validarLimiteMensagem(payload.clienteId, payload.conversaId, identificadorOrigem);
    await this.validarLimiteMensagensUsuarioPorConversa(
      payload.clienteId,
      payload.conversaId,
      configuracao.limiteMaximoMensagensPorConversa ?? null,
    );

    const mensagem = this.mensagemRepo.create({
      clienteId: payload.clienteId,
      conversaId: payload.conversaId,
      papel: 'usuario',
      mensagem: dto.mensagem,
      status: 'recebida',
      metadados: {
        origem: 'endpoint_publico',
        ip: identificadorOrigem,
      },
    });

    const mensagemSalva = await this.mensagemRepo.save(mensagem);
    this.logger.log(
      `Mensagem do usuario salva conversa=${payload.conversaId} cliente=${payload.clienteId} mensagem=${mensagemSalva.id}`,
    );
    return mensagemSalva;
  }

  async listarMensagensConversa(id: string, clienteId: string) {
    this.logger.log(`Listando mensagens conversa=${id} cliente=${clienteId}`);
    await this.buscarConversaOuErro(id, clienteId);
    const mensagens = await this.mensagemRepo.find({
      where: { conversaId: id, clienteId },
      order: { criadoEm: 'ASC' },
    });
    return mensagens.map((item) => this.mapearMensagem(item));
  }

  async responderConversa(id: string, dto: ResponderConversaDto, identificadorOrigem?: string) {
    // Processa a conversa completa, chama o RAG e persiste a resposta do assistente.
    this.logger.log(`Iniciando resposta da conversa conversa=${id} origem=${identificadorOrigem ?? 'n/a'}`);
    const payload = await this.validarTokenConversa(dto.tokenConversa);
    if (payload.conversaId !== id) {
      throw new ForbiddenException('Token da conversa nao corresponde ao identificador informado.');
    }

    const conversa = await this.buscarConversaOuErro(payload.conversaId, payload.clienteId);
    const configuracao = await this.garantirConfiguracao(payload.clienteId);

    if (!configuracao.ativo) {
      throw new ForbiddenException('O agente esta inativo para este cliente.');
    }

    const mensagens = await this.mensagemRepo.find({
      where: { conversaId: payload.conversaId, clienteId: payload.clienteId },
      order: { criadoEm: 'ASC' },
    });
    this.logger.log(
      `Historico carregado conversa=${payload.conversaId} cliente=${payload.clienteId} totalMensagens=${mensagens.length}`,
    );

    if (!mensagens.length) {
      throw new BadRequestException('A conversa nao possui mensagens para responder.');
    }

    const respostaRag = await this.ragService.responderConversa(
      payload.clienteId,
      mensagens.map((item) => ({
        papel: item.papel,
        mensagem: item.mensagem,
        criadoEm: item.criadoEm,
      })),
      configuracao,
      dto.instrucaoExtra,
    );
    this.logger.log(
      `RAG finalizado conversa=${payload.conversaId} ignorar=${respostaRag.ignorarResposta === true} contextos=${respostaRag.contextos.length}`,
    );

    if (respostaRag.ignorarResposta || !respostaRag.resposta) {
      this.logger.log(`Resposta ignorada conversa=${payload.conversaId} motivo=${respostaRag.motivo ?? 'sem_resposta'}`);
      return {
        mensagens: [],
        contextos: [],
        dadosImportantes: conversa.dadosImportantes ?? null,
        ignorada: true,
        motivo: respostaRag.motivo ?? 'sem_resposta',
      };
    }

    const paragrafosResposta = this.quebrarRespostaEmMensagens(respostaRag.resposta);
    this.logger.log(`Persistindo resposta do assistente conversa=${payload.conversaId} paragrafos=${paragrafosResposta.length}`);
    const mensagensAssistente = await this.mensagemRepo.save(
      paragrafosResposta.map((paragrafo, indice) =>
        this.mensagemRepo.create({
          clienteId: payload.clienteId,
          conversaId: payload.conversaId,
          papel: 'assistente',
          mensagem: paragrafo,
          status: 'respondida',
          metadados: {
            origem: 'fluxo_interno_responder',
            ip: identificadorOrigem ?? null,
            contextos: respostaRag.contextos,
            indiceParagrafo: indice,
            totalParagrafos: paragrafosResposta.length,
          },
        }),
      ),
    );

    const dadosImportantesExtraidos = await this.ragService.extrairDadosImportantes(
      mensagens
        .concat(mensagensAssistente)
        .map((item) => ({
          papel: item.papel,
          mensagem: item.mensagem,
          criadoEm: item.criadoEm,
        })),
      conversa.dadosImportantes ?? null,
    );

    if (dadosImportantesExtraidos) {
      this.logger.log(`Atualizando memoria da conversa conversa=${payload.conversaId}`);
      conversa.dadosImportantes = this.mesclarDadosImportantes(
        conversa.dadosImportantes ?? null,
        dadosImportantesExtraidos,
      );
      await this.conversaRepo.save(conversa);
    }

    this.logger.log(`Fluxo de resposta concluido conversa=${payload.conversaId}`);

    return {
      mensagens: mensagensAssistente.map((item) => this.mapearMensagem(item)),
      contextos: respostaRag.contextos,
      dadosImportantes: conversa.dadosImportantes ?? null,
    };
  }

  async contarDocumentos() {
    return this.documentoRepo.count();
  }

  private async garantirCliente(clienteId: string) {
    const cliente = await this.clienteRepo.findOne({ where: { id: clienteId } });
    if (!cliente) {
      throw new NotFoundException('Cliente nao encontrado.');
    }
    return cliente;
  }

  private async garantirConfiguracao(clienteId: string) {
    await this.garantirCliente(clienteId);
    let configuracao = await this.configuracaoRepo.findOne({ where: { clienteId } });
    if (!configuracao) {
      this.logger.log(`Criando configuracao padrao do agente cliente=${clienteId}`);
      configuracao = await this.configuracaoRepo.save(
        this.configuracaoRepo.create({
          clienteId,
          nomeAgente: DEFAULT_AGENT_NAME,
          mensagemBoasVindas: DEFAULT_WELCOME_MESSAGE,
          promptSistema: DEFAULT_AGENT_PROMPT,
          tomResposta: 'objetivo',
          instrucoesExtras: null,
          limiteMaximoMensagensPorConversa: null,
          ativo: true,
        }),
      );
    }
    return configuracao;
  }

  private async validarAgenteAtivo(clienteId: string) {
    const configuracao = await this.garantirConfiguracao(clienteId);
    if (!configuracao.ativo) {
      throw new ForbiddenException('O agente esta inativo para este cliente.');
    }
    return configuracao;
  }

  private async buscarConversaOuErro(id: string, clienteId: string) {
    const conversa = await this.conversaRepo.findOne({ where: { id, clienteId } });
    if (!conversa) {
      throw new NotFoundException('Conversa nao encontrada.');
    }
    return conversa;
  }

  private async gerarTokenConversa(conversaId: string, clienteId: string) {
    this.logger.debug(`Gerando token de conversa conversa=${conversaId} cliente=${clienteId}`);
    const payload: PayloadTokenConversa = {
      conversaId,
      clienteId,
      tipo: 'conversa',
    };
    return this.jwtService.signAsync(payload, { expiresIn: '90d' });
  }

  private async validarTokenConversa(tokenConversa: string): Promise<PayloadTokenConversa> {
    try {
      const payload = await this.jwtService.verifyAsync<PayloadTokenConversa>(tokenConversa);
      if (payload.tipo !== 'conversa') {
        throw new ForbiddenException('Token de conversa invalido.');
      }
      this.logger.debug(`Token de conversa validado conversa=${payload.conversaId} cliente=${payload.clienteId}`);
      return payload;
    } catch {
      throw new ForbiddenException('Token de conversa invalido ou expirado.');
    }
  }

  private validarLimiteCriacaoConversa(clienteId: string, identificadorOrigem: string) {
    const limite = Number(process.env.LIMITE_CRIAR_CONVERSA_POR_MINUTO || 20);
    const chave = `criar-conversa:${clienteId}:${identificadorOrigem}`;

    try {
      this.limiteRequisicoesService.verificarOuFalhar(chave, limite, 60_000);
    } catch (error) {
      this.logger.warn(`Limite excedido na criacao de conversa para cliente ${clienteId} via ${identificadorOrigem}`);
      throw error;
    }
  }

  private validarLimiteMensagem(clienteId: string, conversaId: string, identificadorOrigem: string) {
    const limites = [
      {
        chave: `mensagem:conversa:minuto:${clienteId}:${conversaId}`,
        limite: Number(process.env.LIMITE_MENSAGENS_CONVERSA_POR_MINUTO || 30),
        janelaMs: 60_000,
        descricao: 'por minuto da conversa',
      },
      {
        chave: `mensagem:conversa:hora:${clienteId}:${conversaId}`,
        limite: Number(process.env.LIMITE_MENSAGENS_CONVERSA_POR_HORA || 300),
        janelaMs: 60 * 60 * 1000,
        descricao: 'por hora da conversa',
      },
      {
        chave: `mensagem:conversa:dia:${clienteId}:${conversaId}`,
        limite: Number(process.env.LIMITE_MENSAGENS_CONVERSA_POR_DIA || 400),
        janelaMs: 24 * 60 * 60 * 1000,
        descricao: 'por dia da conversa',
      },
      {
        chave: `mensagem:cliente:dia:${clienteId}`,
        limite: Number(process.env.LIMITE_MENSAGENS_CLIENTE_POR_DIA || 3000),
        janelaMs: 24 * 60 * 60 * 1000,
        descricao: 'por dia do cliente',
      },
    ];

    for (const item of limites) {
      try {
        this.limiteRequisicoesService.verificarOuFalhar(item.chave, item.limite, item.janelaMs);
      } catch (error) {
        this.logger.warn(
          `Limite excedido no envio de mensagem ${item.descricao} para cliente ${clienteId} conversa ${conversaId} via ${identificadorOrigem}`,
        );
        throw error;
      }
    }
  }

  private async validarLimiteMensagensUsuarioPorConversa(
    clienteId: string,
    conversaId: string,
    limiteMaximoMensagensPorConversa: number | null,
  ) {
    if (!limiteMaximoMensagensPorConversa) {
      return;
    }

    const totalMensagensUsuario = await this.mensagemRepo.count({
      where: {
        clienteId,
        conversaId,
        papel: 'usuario',
      },
    });

    if (totalMensagensUsuario >= limiteMaximoMensagensPorConversa) {
      throw new ForbiddenException('Esta conversa atingiu o limite maximo de mensagens do usuario.');
    }
  }

  private mesclarDadosImportantes(
    atuais: Record<string, unknown> | null,
    extraidos: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!extraidos) {
      return atuais;
    }

    return {
      ...(atuais ?? {}),
      ...extraidos,
    };
  }

  private quebrarRespostaEmMensagens(resposta: string) {
    const paragrafos = resposta
      .split(/\n\s*\n+/)
      .map((item) => item.trim())
      .filter(Boolean);

    return paragrafos.length ? paragrafos : [resposta.trim()];
  }

  private mapearMensagem(mensagem: MensagemEntity) {
    return {
      id: mensagem.id,
      clienteId: mensagem.clienteId,
      conversaId: mensagem.conversaId,
      papel: mensagem.papel,
      mensagem: mensagem.mensagem,
      status: mensagem.status,
      metadados: mensagem.metadados ?? null,
      criadoEm: mensagem.criadoEm,
      atualizadoEm: mensagem.atualizadoEm,
    };
  }
}
