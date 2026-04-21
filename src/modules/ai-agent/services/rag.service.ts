import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfiguracaoAgenteEntity } from '../entities/configuracao-agente.entity';
import { EmbeddingService } from './embedding.service';

interface MensagemHistorico {
  papel: string;
  mensagem: string;
  criadoEm?: Date | string;
}

interface RespostaRag {
  resposta: string | null;
  contextos: Array<{
    id: string;
    titulo: string | null;
    pergunta: string;
    resposta: string;
    similaridade: number;
  }>;
  ignorarResposta?: boolean;
  motivo?: string | null;
}

type DadosImportantes = Record<string, unknown> | null;

@Injectable()
export class RagService {
  // Service responsavel por classificar a conversa, recuperar contexto e chamar o modelo.
  private readonly logger = new Logger(RagService.name);
  private readonly client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  constructor(private readonly embeddingService: EmbeddingService) { }

  private obterModeloResposta(): string {
    return process.env.RAG_MODELO_RESPOSTA || 'gpt-5-mini';
  }

  private obterModeloClassificacao(): string {
    return process.env.RAG_MODELO_CLASSIFICACAO || 'gpt-5-nano';
  }

  private modeloSuportaTemperature(modelo: string): boolean {
    const modeloNormalizado = modelo.trim().toLowerCase();
    return !modeloNormalizado.startsWith('gpt-5');
  }

  private montarParametrosChat(
    model: string,
    messages: Array<{ role: 'system' | 'user'; content: string }>,
    temperature?: number,
  ): OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming {
    const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
      model,
      messages,
    };

    if (temperature !== undefined && this.modeloSuportaTemperature(model)) {
      params.temperature = temperature;
    }

    return params;
  }

  async responderConversa(
    clienteId: string,
    historico: MensagemHistorico[],
    configuracao: ConfiguracaoAgenteEntity,
    instrucaoExtra?: string,
  ): Promise<RespostaRag> {
    this.logger.log(`Iniciando pipeline do RAG cliente=${clienteId} totalMensagens=${historico.length}`);
    const ultimaMensagemUsuario = [...historico].reverse().find((item) => item.papel === 'usuario');
    if (!ultimaMensagemUsuario) {
      throw new InternalServerErrorException('Nao existe mensagem de usuario para responder.');
    }

    const deveIgnorarResposta = await this.deveIgnorarRespostaPorDespedida(historico);
    if (deveIgnorarResposta) {
      this.logger.log(`Resposta ignorada por classificacao de despedida cliente=${clienteId}`);
      return {
        resposta: null,
        contextos: [],
        ignorarResposta: true,
        motivo: 'despedida_ja_respondida',
      };
    }

    const limiteContextos = Number(process.env.RAG_QUANTIDADE_MAXIMA_CONTEXTO || 3);
    this.logger.log(
      `Buscando contextos do RAG cliente=${clienteId} limite=${limiteContextos} tamanhoPergunta=${ultimaMensagemUsuario.mensagem.length}`,
    );
    const documentos = await this.embeddingService.buscarDocumentos(
      ultimaMensagemUsuario.mensagem,
      clienteId,
      limiteContextos,
    );

    const historicoFormatado = historico
      .map((item) => `${item.papel}: ${item.mensagem}`)
      .join('\n');

    const contextosFormatados = documentos
      .map(
        (item, indice) =>
          `Contexto ${indice + 1}:\nTitulo: ${item.titulo ?? 'Sem titulo'}\nPergunta: ${item.pergunta}\nResposta: ${item.resposta}`,
      )
      .join('\n\n');

    const promptSistema = [
      configuracao.promptSistema,
      configuracao.tomResposta ? `Tom de resposta: ${configuracao.tomResposta}.` : null,
      configuracao.instrucoesExtras ?? null,
      instrucaoExtra ?? null,
    ]
      .filter(Boolean)
      .join('\n\n');

    const promptUsuario = [
      'Historico da conversa atual:',
      historicoFormatado || 'Nenhum historico encontrado.',
      '',
      'Contextos recuperados do RAG:',
      contextosFormatados || 'Nenhum contexto encontrado.',
      '',
      'Responda a conversa atual usando o historico completo e os contextos recuperados.',
      'Se nao souber, diga de forma objetiva que nao encontrou essa informacao.',
    ].join('\n');

    try {
      this.logger.log(
        `Chamando modelo de resposta do RAG cliente=${clienteId} modelo=${this.obterModeloResposta()} contextos=${documentos.length}`,
      );
      const completion = await this.client.chat.completions.create(
        this.montarParametrosChat(
          this.obterModeloResposta(),
          [
            { role: 'system', content: promptSistema },
            { role: 'user', content: promptUsuario },
          ],
          Number(process.env.RAG_TEMPERATURA || 0.2),
        ),
      );

      const resposta = completion.choices[0]?.message?.content?.trim();

      if (!resposta) {
        throw new InternalServerErrorException('O modelo nao retornou resposta.');
      }

      this.logger.log(`Resposta do RAG concluida cliente=${clienteId} tamanhoResposta=${resposta.length}`);

      return {
        resposta,
        contextos: documentos.map((item) => ({
          id: String(item.id),
          titulo: item.titulo,
          pergunta: item.pergunta,
          resposta: item.resposta,
          similaridade: Number(item.similaridade),
        })),
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error('Falha ao gerar resposta do RAG', err.stack);
      throw new InternalServerErrorException('Nao foi possivel gerar uma resposta.');
    }
  }

  async extrairDadosImportantes(
    historico: MensagemHistorico[],
    dadosImportantesAtuais?: DadosImportantes,
  ): Promise<DadosImportantes> {
    this.logger.log(`Iniciando extracao de dados importantes totalMensagens=${historico.length}`);
    const historicoFormatado = historico
      .map((item) => `${item.papel}: ${item.mensagem}`)
      .join('\n');

    const memoriaAtual = dadosImportantesAtuais ? JSON.stringify(dadosImportantesAtuais, null, 2) : '{}';

    const promptSistema = [
      'Voce extrai memoria util de uma conversa de atendimento.',
      'Retorne apenas JSON valido, sem markdown, sem comentarios e sem texto adicional.',
      'Inclua somente fatos relevantes e relativamente estaveis sobre o usuario ou o atendimento.',
      'Exemplos: nome, telefone, email, cidade, empresa, produto_interesse, servico_interesse, objetivo, preferencias, restricoes, observacoes.',
      'Se nao houver nada relevante para salvar, retorne {}.',
    ].join('\n');

    const promptUsuario = [
      'Memoria atual da conversa:',
      memoriaAtual,
      '',
      'Historico da conversa:',
      historicoFormatado || 'Nenhum historico encontrado.',
      '',
      'Atualize a memoria com base apenas no que estiver explicito ou altamente inferivel na conversa.',
      'Nao invente dados.',
      'Retorne somente um objeto JSON.',
    ].join('\n');

    try {
      this.logger.log(`Chamando modelo de memoria modelo=${this.obterModeloResposta()}`);
      const completion = await this.client.chat.completions.create(
        this.montarParametrosChat(
          this.obterModeloResposta(),
          [
            { role: 'system', content: promptSistema },
            { role: 'user', content: promptUsuario },
          ],
          0,
        ),
      );

      const conteudo = completion.choices[0]?.message?.content?.trim();
      if (!conteudo) {
        this.logger.log('Extracao de dados importantes retornou vazia');
        return null;
      }

      const json = this.extrairJson(conteudo);
      if (!json || Array.isArray(json) || typeof json !== 'object') {
        this.logger.warn('Extracao de dados importantes retornou JSON invalido');
        return null;
      }

      this.logger.log('Extracao de dados importantes concluida com sucesso');
      return json as Record<string, unknown>;
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`Falha ao extrair dados importantes: ${err.message}`);
      return null;
    }
  }

  private async deveIgnorarRespostaPorDespedida(historico: MensagemHistorico[]): Promise<boolean> {
    const ultimaMensagemUsuario = [...historico]
      .reverse()
      .find((item) => item.papel === 'usuario' && item.criadoEm);

    if (!ultimaMensagemUsuario?.criadoEm) {
      this.logger.warn('Classificacao de despedida ignorada por falta de timestamp na ultima mensagem do usuario');
      return false;
    }

    const referencia = new Date(ultimaMensagemUsuario.criadoEm);
    if (Number.isNaN(referencia.getTime())) {
      this.logger.warn('Classificacao de despedida ignorada por timestamp invalido na ultima mensagem do usuario');
      return false;
    }

    const janelaInicial = referencia.getTime() - 30_000;
    const recorte = historico
      .filter((item) => {
        if (!item.criadoEm) {
          return false;
        }

        const criadoEm = new Date(item.criadoEm);
        if (Number.isNaN(criadoEm.getTime())) {
          return false;
        }

        const timestamp = criadoEm.getTime();
        return timestamp >= janelaInicial && timestamp <= referencia.getTime();
      })
      .slice(-8);

    if (!recorte.some((item) => item.papel === 'usuario') || !recorte.some((item) => item.papel === 'assistente')) {
      return false;
    }

    this.logger.log(
      `Classificando despedida no recorte recente totalMensagens=${recorte.length} janelaSegundos=30`,
    );

    const promptSistema = [
      'Voce classifica se uma conversa de atendimento deve ficar sem nova resposta.',
      'Analise apenas o recorte recente enviado.',
      'Retorne apenas JSON valido, sem markdown e sem texto extra.',
      'Use o formato: {"ignorarResposta": boolean, "motivo": string}.',
      'Marque ignorarResposta=true apenas quando as ultimas mensagens do usuario forem uma despedida ou encerramento, e o assistente ja tiver respondido encerrando essa despedida.',
      'Tambem marque ignorarResposta=true quando o usuario demonstrar claramente que nao quer mais continuar a conversa.',
      'Se o assistente puxar conversa e o usuario responder algo como "nao, obrigado", "ok", "ok entendi", "ok, entendi", "certo", "tranquilo" ou outra confirmacao curta sem interesse em continuar, nao continue a conversa.',
      'Nesses casos, considere que a conversa foi encerrada mesmo sem um "tchau" explicito.',
      'Exemplo: assistente: "Se precisar de mais detalhes ou ajuda para escolher o plano ideal, estou a disposicao! Voce tem alguma necessidade especifica em mente?" usuario: "nao, obrigado" => ignorarResposta=true.',
      'Exemplo: assistente: "Posso te ajudar com mais alguma coisa?" usuario: "ok, entendi" => ignorarResposta=true.',
      'Se houver qualquer duvida, retorne ignorarResposta=false.',
    ].join('\n');

    const promptUsuario = [
      'Recorte recente da conversa:',
      recorte.map((item) => `${item.papel}: ${item.mensagem}`).join('\n'),
      '',
      'Classifique agora.',
    ].join('\n');

    try {
      this.logger.log(`Chamando modelo de classificacao modelo=${this.obterModeloClassificacao()}`);
      const completion = await this.client.chat.completions.create(
        this.montarParametrosChat(
          this.obterModeloClassificacao(),
          [
            { role: 'system', content: promptSistema },
            { role: 'user', content: promptUsuario },
          ],
          0,
        ),
      );

      const conteudo = completion.choices[0]?.message?.content?.trim();
      if (!conteudo) {
        return false;
      }

      const json = this.extrairJson(conteudo);
      if (!json || Array.isArray(json) || typeof json !== 'object') {
        return false;
      }

      const ignorarResposta = (json as Record<string, unknown>).ignorarResposta === true;
      this.logger.log(`Classificacao de despedida concluida ignorar=${ignorarResposta}`);
      return ignorarResposta;
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`Falha ao classificar despedida da conversa: ${err.message}`);
      return false;
    }
  }

  private extrairJson(conteudo: string): unknown {
    try {
      return JSON.parse(conteudo);
    } catch {
      const inicio = conteudo.indexOf('{');
      const fim = conteudo.lastIndexOf('}');

      if (inicio === -1 || fim === -1 || fim <= inicio) {
        return null;
      }

      try {
        return JSON.parse(conteudo.slice(inicio, fim + 1));
      } catch {
        return null;
      }
    }
  }
}
