import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfiguracaoAgenteEntity } from '../entities/configuracao-agente.entity';
import { EmbeddingService } from './embedding.service';

interface MensagemHistorico {
  papel: string;
  mensagem: string;
}

interface RespostaRag {
  resposta: string;
  contextos: Array<{
    id: string;
    titulo: string | null;
    pergunta: string;
    resposta: string;
    similaridade: number;
  }>;
}

type DadosImportantes = Record<string, unknown> | null;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  constructor(private readonly embeddingService: EmbeddingService) {}

  async responderConversa(
    clienteId: string,
    historico: MensagemHistorico[],
    configuracao: ConfiguracaoAgenteEntity,
    instrucaoExtra?: string,
  ): Promise<RespostaRag> {
    const ultimaMensagemUsuario = [...historico].reverse().find((item) => item.papel === 'usuario');
    if (!ultimaMensagemUsuario) {
      throw new InternalServerErrorException('Nao existe mensagem de usuario para responder.');
    }

    const limiteContextos = Number(process.env.RAG_QUANTIDADE_MAXIMA_CONTEXTO || 3);
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
      const completion = await this.client.chat.completions.create({
        model: process.env.RAG_MODELO_RESPOSTA || 'gpt-4o-mini',
        temperature: Number(process.env.RAG_TEMPERATURA || 0.2),
        messages: [
          { role: 'system', content: promptSistema },
          { role: 'user', content: promptUsuario },
        ],
      });

      const resposta = completion.choices[0]?.message?.content?.trim();
      if (!resposta) {
        throw new InternalServerErrorException('O modelo nao retornou resposta.');
      }

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
      const completion = await this.client.chat.completions.create({
        model: process.env.RAG_MODELO_RESPOSTA || 'gpt-4o-mini',
        temperature: 0,
        messages: [
          { role: 'system', content: promptSistema },
          { role: 'user', content: promptUsuario },
        ],
      });

      const conteudo = completion.choices[0]?.message?.content?.trim();
      if (!conteudo) {
        return null;
      }

      const json = this.extrairJson(conteudo);
      if (!json || Array.isArray(json) || typeof json !== 'object') {
        return null;
      }

      return json as Record<string, unknown>;
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`Falha ao extrair dados importantes: ${err.message}`);
      return null;
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
