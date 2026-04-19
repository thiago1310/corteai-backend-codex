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
    return this.garantirConfiguracao(clienteId);
  }

  async salvarConfiguracaoAgente(clienteId: string, dto: SalvarConfiguracaoAgenteDto) {
    const configuracao = await this.garantirConfiguracao(clienteId);
    configuracao.nomeAgente = dto.nomeAgente ?? configuracao.nomeAgente;
    configuracao.mensagemBoasVindas = dto.mensagemBoasVindas ?? configuracao.mensagemBoasVindas;
    configuracao.promptSistema = dto.promptSistema ?? configuracao.promptSistema;
    configuracao.tomResposta = dto.tomResposta ?? configuracao.tomResposta;
    configuracao.instrucoesExtras = dto.instrucoesExtras ?? configuracao.instrucoesExtras;
    configuracao.ativo = dto.ativo ?? configuracao.ativo;
    return this.configuracaoRepo.save(configuracao);
  }

  async criarConversa(dto: CriarConversaDto, identificadorOrigem: string) {
    await this.garantirCliente(dto.clienteId);
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
    const configuracao = await this.garantirConfiguracao(dto.clienteId);
    return {
      conversaId: conversa.id,
      tokenConversa: await this.gerarTokenConversa(conversa.id, dto.clienteId),
      mensagemBoasVindas: configuracao.mensagemBoasVindas ?? DEFAULT_WELCOME_MESSAGE,
    };
  }

  async renovarTokenConversa(dto: RenovarTokenConversaDto, _identificadorOrigem?: string) {
    const payload = await this.validarTokenConversa(dto.tokenConversa);
    const conversa = await this.buscarConversaOuErro(payload.conversaId, payload.clienteId);
    return {
      tokenConversa: await this.gerarTokenConversa(conversa.id, conversa.clienteId),
      historico: await this.listarMensagensConversa(conversa.id, conversa.clienteId),
    };
  }

  async obterConversa(id: string, clienteId: string) {
    return this.buscarConversaOuErro(id, clienteId);
  }

  async atualizarDadosImportantes(id: string, clienteId: string, dto: AtualizarDadosImportantesDto) {
    const conversa = await this.buscarConversaOuErro(id, clienteId);
    conversa.dadosImportantes = dto.dadosImportantes ?? null;
    return this.conversaRepo.save(conversa);
  }

  async criarMensagem(dto: CriarMensagemDto, identificadorOrigem: string) {
    const payload = await this.validarTokenConversa(dto.tokenConversa);
    await this.buscarConversaOuErro(payload.conversaId, payload.clienteId);
    this.validarLimiteMensagem(payload.clienteId, payload.conversaId, identificadorOrigem);

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

    return this.mensagemRepo.save(mensagem);
  }

  async listarMensagensConversa(id: string, clienteId: string) {
    await this.buscarConversaOuErro(id, clienteId);
    const mensagens = await this.mensagemRepo.find({
      where: { conversaId: id, clienteId },
      order: { criadoEm: 'ASC' },
    });
    return mensagens.map((item) => this.mapearMensagem(item));
  }

  async responderConversa(id: string, dto: ResponderConversaDto, identificadorOrigem?: string) {
    const payload = await this.validarTokenConversa(dto.tokenConversa);
    if (payload.conversaId !== id) {
      throw new ForbiddenException('Token da conversa nao corresponde ao identificador informado.');
    }

    await this.buscarConversaOuErro(payload.conversaId, payload.clienteId);
    const configuracao = await this.garantirConfiguracao(payload.clienteId);
    const mensagens = await this.mensagemRepo.find({
      where: { conversaId: payload.conversaId, clienteId: payload.clienteId },
      order: { criadoEm: 'ASC' },
    });

    if (!mensagens.length) {
      throw new BadRequestException('A conversa nao possui mensagens para responder.');
    }

    const respostaRag = await this.ragService.responderConversa(
      payload.clienteId,
      mensagens.map((item) => ({ papel: item.papel, mensagem: item.mensagem })),
      configuracao,
      dto.instrucaoExtra,
    );

    const mensagemAssistente = await this.mensagemRepo.save(
      this.mensagemRepo.create({
        clienteId: payload.clienteId,
        conversaId: payload.conversaId,
        papel: 'assistente',
        mensagem: respostaRag.resposta,
        status: 'respondida',
        metadados: {
          origem: 'fluxo_interno_responder',
          ip: identificadorOrigem ?? null,
          contextos: respostaRag.contextos,
        },
      }),
    );

    return {
      mensagem: this.mapearMensagem(mensagemAssistente),
      contextos: respostaRag.contextos,
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
      configuracao = await this.configuracaoRepo.save(
        this.configuracaoRepo.create({
          clienteId,
          nomeAgente: DEFAULT_AGENT_NAME,
          mensagemBoasVindas: DEFAULT_WELCOME_MESSAGE,
          promptSistema: DEFAULT_AGENT_PROMPT,
          tomResposta: 'objetivo',
          instrucoesExtras: null,
          ativo: true,
        }),
      );
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
    const limite = Number(process.env.LIMITE_MENSAGENS_POR_MINUTO || 60);
    const chave = `mensagem:${clienteId}:${conversaId}:${identificadorOrigem}`;

    try {
      this.limiteRequisicoesService.verificarOuFalhar(chave, limite, 60_000);
    } catch (error) {
      this.logger.warn(
        `Limite excedido no envio de mensagem para cliente ${clienteId} conversa ${conversaId} via ${identificadorOrigem}`,
      );
      throw error;
    }
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
