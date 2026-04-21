import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import OpenAI from 'openai';

interface ResultadoBuscaDocumento {
  id: string;
  titulo: string | null;
  pergunta: string;
  resposta: string;
  conteudo: string;
  metadados: Record<string, unknown> | null;
  similaridade: number;
}

export interface DocumentoInput {
  clienteId: string;
  titulo?: string | null;
  pergunta: string;
  resposta: string;
  ativo: boolean;
  origem?: string | null;
  metadados?: Record<string, unknown> | null;
}

export interface DocumentoAtualizacao {
  titulo?: string | null;
  pergunta?: string;
  resposta?: string;
  ativo?: boolean;
  origem?: string | null;
  metadados?: Record<string, unknown> | null;
}

@Injectable()
export class EmbeddingService {
  // Service que gera embeddings e consulta a base vetorial dos documentos.
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  constructor(private readonly dataSource: DataSource) {}

  async gerarEmbedding(texto: string): Promise<number[]> {
    try {
      this.logger.log(`Gerando embedding tamanhoTexto=${texto.trim().length}`);
      const resposta = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: texto.trim(),
      });
      this.logger.log(`Embedding gerado dimensoes=${resposta.data[0]?.embedding?.length ?? 0}`);
      return resposta.data[0]?.embedding || [];
    } catch (error) {
      const err = error as Error;
      this.logger.error('Falha ao gerar embedding', err.stack);
      throw new InternalServerErrorException('Nao foi possivel gerar o embedding.');
    }
  }

  async criarDocumento(input: DocumentoInput): Promise<string> {
    // Cria o documento e materializa o vetor para busca semantica futura.
    this.logger.log(`Criando documento cliente=${input.clienteId} titulo=${input.titulo ?? 'sem_titulo'}`);
    const conteudo = this.montarConteudo(input.pergunta, input.resposta);
    const vetorEmbedding = this.converterParaVetor(await this.gerarEmbedding(conteudo));

    const linhas = await this.dataSource.query(
      `INSERT INTO documentos (
         cliente_id,
         titulo,
         pergunta,
         resposta,
         conteudo,
         metadados,
         vetor_embedding,
         ativo,
         origem
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8, $9)
       RETURNING id`,
      [
        input.clienteId,
        input.titulo ?? null,
        input.pergunta,
        input.resposta,
        conteudo,
        input.metadados ?? null,
        vetorEmbedding,
        input.ativo,
        input.origem ?? null,
      ],
    );

    const id = String(linhas[0]?.id);
    this.logger.log(`Documento criado id=${id} cliente=${input.clienteId}`);
    return id;
  }

  async atualizarDocumento(id: string, clienteId: string, atualizacao: DocumentoAtualizacao): Promise<void> {
    this.logger.log(`Atualizando documento id=${id} cliente=${clienteId}`);
    const atual = await this.buscarDocumentoBruto(id, clienteId);
    if (!atual) {
      throw new InternalServerErrorException('Documento nao encontrado.');
    }

    const pergunta = atualizacao.pergunta ?? atual.pergunta;
    const resposta = atualizacao.resposta ?? atual.resposta;
    const conteudo = this.montarConteudo(pergunta, resposta);
    const vetorEmbedding = this.converterParaVetor(await this.gerarEmbedding(conteudo));

    await this.dataSource.query(
      `UPDATE documentos
       SET titulo = $1,
           pergunta = $2,
           resposta = $3,
           conteudo = $4,
           metadados = $5,
           vetor_embedding = $6::vector,
           ativo = $7,
           origem = $8,
           atualizado_em = now()
       WHERE id = $9 AND cliente_id = $10`,
      [
        atualizacao.titulo ?? atual.titulo,
        pergunta,
        resposta,
        conteudo,
        atualizacao.metadados !== undefined ? atualizacao.metadados : atual.metadados,
        vetorEmbedding,
        atualizacao.ativo ?? atual.ativo,
        atualizacao.origem !== undefined ? atualizacao.origem : atual.origem,
        id,
        clienteId,
      ],
    );
  }

  async excluirDocumento(id: string, clienteId: string): Promise<void> {
    this.logger.log(`Excluindo documento id=${id} cliente=${clienteId}`);
    await this.dataSource.query('DELETE FROM documentos WHERE id = $1 AND cliente_id = $2', [id, clienteId]);
  }

  async buscarDocumentos(consulta: string, clienteId: string, limite = 3): Promise<ResultadoBuscaDocumento[]> {
    // Busca vetorial dos documentos mais proximos para compor o contexto do RAG.
    this.logger.log(`Buscando documentos cliente=${clienteId} limite=${limite} tamanhoConsulta=${consulta.trim().length}`);
    const vetorEmbedding = this.converterParaVetor(await this.gerarEmbedding(consulta));
    const linhas = await this.dataSource.query(
      `SELECT id,
              titulo,
              pergunta,
              resposta,
              conteudo,
              metadados,
              1 - (vetor_embedding <=> $1::vector) AS similaridade
       FROM documentos
       WHERE cliente_id = $2
         AND ativo IS TRUE
       ORDER BY vetor_embedding <=> $1::vector
       LIMIT $3`,
      [vetorEmbedding, clienteId, limite],
    );

    this.logger.log(`Busca vetorial concluida cliente=${clienteId} resultados=${linhas.length}`);
    return linhas as ResultadoBuscaDocumento[];
  }

  private async buscarDocumentoBruto(id: string, clienteId: string) {
    const [linha] = await this.dataSource.query(
      `SELECT id, titulo, pergunta, resposta, conteudo, metadados, ativo, origem
       FROM documentos
       WHERE id = $1 AND cliente_id = $2`,
      [id, clienteId],
    );
    return linha;
  }

  private montarConteudo(pergunta: string, resposta: string) {
    return `Pergunta: ${pergunta.trim()}\nResposta: ${resposta.trim()}`;
  }

  private converterParaVetor(vetor: number[]) {
    if (!Array.isArray(vetor) || vetor.length === 0) {
      throw new InternalServerErrorException('Embedding retornou vetor vazio.');
    }
    return `[${vetor.map((valor) => (Number.isFinite(valor) ? valor : 0)).join(',')}]`;
  }
}
