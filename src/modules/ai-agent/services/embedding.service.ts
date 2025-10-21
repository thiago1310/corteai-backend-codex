import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import OpenAI from 'openai';

interface ResultadoBuscaConhecimento {
  id: string;
  question: string;
  answer: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
}

export interface DocumentoConhecimentoInput {
  barbeariaId: string;
  pergunta: string;
  resposta: string;
  ativo: boolean;
  metadados?: Record<string, unknown> | null;
}

export interface DocumentoConhecimentoAtualizacao {
  pergunta?: string;
  resposta?: string;
  ativo?: boolean;
  metadados?: Record<string, unknown> | null;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  constructor(private readonly dataSource: DataSource) {
    if (!process.env.OPENAI_API_KEY) {
      this.logger.warn('OPENAI_API_KEY não está configurada. A geração de embeddings irá falhar.');
    }
  }

  async gerarEmbedding(texto: string): Promise<number[]> {
    try {
      const limpo = texto.trim();
      const resposta = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: limpo,
      });
      return resposta.data[0]?.embedding || [];
    } catch (error) {
      const err = error as Error;
      this.logger.error('Falha ao gerar embedding', err.stack);
      throw new InternalServerErrorException('Não foi possível gerar o embedding.');
    }
  }

  async criarDocumento(input: DocumentoConhecimentoInput): Promise<string> {
    const conteudo = this.montarConteudo(input.pergunta, input.resposta);
    const embedding = await this.gerarEmbedding(conteudo);
    const vetor = this.converterParaVetor(embedding);

    const linhas = await this.dataSource.query(
      `INSERT INTO documents (
         barbearia_id,
         question,
         answer,
         status,
         content,
         metadata,
         embedding
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::vector)
       RETURNING id`,
      [
        input.barbeariaId,
        input.pergunta,
        input.resposta,
        input.ativo,
        conteudo,
        input.metadados ?? null,
        vetor,
      ],
    );

    return linhas[0]?.id;
  }

  async atualizarDocumento(
    id: string,
    barbeariaId: string,
    atualizacao: DocumentoConhecimentoAtualizacao,
  ): Promise<void> {
    const campos: string[] = [];
    const valores: unknown[] = [];

    let precisaNovoEmbedding = false;
    let proximaPergunta: string | undefined;
    let proximaResposta: string | undefined;

    if (atualizacao.pergunta !== undefined) {
      campos.push(`question = $${campos.length + 1}`);
      valores.push(atualizacao.pergunta);
      precisaNovoEmbedding = true;
      proximaPergunta = atualizacao.pergunta;
    }

    if (atualizacao.resposta !== undefined) {
      campos.push(`answer = $${campos.length + 1}`);
      valores.push(atualizacao.resposta);
      precisaNovoEmbedding = true;
      proximaResposta = atualizacao.resposta;
    }

    if (atualizacao.ativo !== undefined) {
      campos.push(`status = $${campos.length + 1}`);
      valores.push(atualizacao.ativo);
    }

    if (atualizacao.metadados !== undefined) {
      campos.push(`metadata = $${campos.length + 1}`);
      valores.push(atualizacao.metadados ?? null);
    }

    if (precisaNovoEmbedding) {
      const [linhaAtual] = await this.dataSource.query(
        `SELECT question, answer
         FROM documents
         WHERE id = $1 AND barbearia_id = $2`,
        [id, barbeariaId],
      );

      if (!linhaAtual) {
        throw new InternalServerErrorException('Documento de conhecimento não encontrado.');
      }

      const pergunta = proximaPergunta ?? linhaAtual.question;
      const resposta = proximaResposta ?? linhaAtual.answer;
      const conteudo = this.montarConteudo(pergunta, resposta);
      const embedding = await this.gerarEmbedding(conteudo);
      const vetor = this.converterParaVetor(embedding);

      campos.push(`content = $${campos.length + 1}`);
      valores.push(conteudo);
      campos.push(`embedding = $${campos.length + 1}::vector`);
      valores.push(vetor);
    }

    if (!campos.length) {
      return;
    }

    valores.push(id, barbeariaId);

    await this.dataSource.query(
      `UPDATE documents
       SET ${campos.join(', ')}
       WHERE id = $${campos.length + 1} AND barbearia_id = $${campos.length + 2}`,
      valores,
    );
  }

  async excluirDocumento(id: string, barbeariaId: string): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM documents WHERE id = $1 AND barbearia_id = $2`,
      [id, barbeariaId],
    );
  }

  async buscarDocumentos(
    pergunta: string,
    barbeariaId: string,
    limite = 3,
  ): Promise<ResultadoBuscaConhecimento[]> {
    const embedding = await this.gerarEmbedding(pergunta);
    const vetor = this.converterParaVetor(embedding);

    const linhas = await this.dataSource.query(
      `SELECT id,
              question,
              answer,
              metadata,
              1 - (embedding <=> $1::vector) AS similarity
       FROM documents
       WHERE barbearia_id = $2
         AND status IS TRUE
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [vetor, barbeariaId, limite],
    );

    return linhas as ResultadoBuscaConhecimento[];
  }

  private montarConteudo(pergunta?: string, resposta?: string) {
    const perguntaLimpa = (pergunta ?? '').trim();
    const respostaLimpa = (resposta ?? '').trim();
    return `Pergunta: ${perguntaLimpa}\nResposta: ${respostaLimpa}`;
  }

  private converterParaVetor(vetor: number[]): string {
    if (!Array.isArray(vetor) || vetor.length === 0) {
      throw new InternalServerErrorException('Embedding retornou um vetor vazio.');
    }

    const formatado = vetor.map((valor) => (Number.isFinite(valor) ? valor : 0));
    return `[${formatado.join(',')}]`;
  }
}
