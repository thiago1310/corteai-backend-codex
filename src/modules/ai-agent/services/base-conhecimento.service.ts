import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  DocumentoConhecimentoAtualizacao,
  DocumentoConhecimentoInput,
  EmbeddingService,
} from './embedding.service';
import {
  AtualizarConhecimentoDto,
  CriarConhecimentoDto,
} from '../dto/conhecimento.dto';

interface LinhaConhecimento {
  id: string;
  barbearia_id: string;
  question: string;
  answer: string;
  status: boolean;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

@Injectable()
export class BaseConhecimentoService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async listar(barbeariaId: string) {
    const linhas = await this.dataSource.query(
      `SELECT id, barbearia_id, question, answer, status, metadata, created_at
       FROM documents
       WHERE barbearia_id = $1
       ORDER BY created_at DESC`,
      [barbeariaId],
    );

    return (linhas as LinhaConhecimento[]).map((linha) => this.transformarLinha(linha));
  }

  async criar(dto: CriarConhecimentoDto) {
    const entrada: DocumentoConhecimentoInput = {
      barbeariaId: dto.barbeariaId,
      pergunta: dto.pergunta,
      resposta: dto.resposta,
      ativo: dto.ativo,
      metadados: dto.metadados ?? null,
    };

    const id = await this.embeddingService.criarDocumento(entrada);
    return this.buscarPorId(id, dto.barbeariaId);
  }

  async atualizar(id: string, barbeariaId: string, dto: AtualizarConhecimentoDto) {
    const atualizacao: DocumentoConhecimentoAtualizacao = {};

    if (dto.pergunta !== undefined) {
      atualizacao.pergunta = dto.pergunta;
    }

    if (dto.resposta !== undefined) {
      atualizacao.resposta = dto.resposta;
    }

    if (dto.ativo !== undefined) {
      atualizacao.ativo = dto.ativo;
    }

    if (dto.metadados !== undefined) {
      atualizacao.metadados = dto.metadados ?? null;
    }

    await this.embeddingService.atualizarDocumento(id, barbeariaId, atualizacao);
    return this.buscarPorId(id, barbeariaId);
  }

  async remover(id: string, barbeariaId: string) {
    await this.garantirExistencia(id, barbeariaId);
    await this.embeddingService.excluirDocumento(id, barbeariaId);
  }

  private async garantirExistencia(id: string, barbeariaId: string) {
    const linhas = await this.dataSource.query(
      `SELECT id
       FROM documents
       WHERE id = $1 AND barbearia_id = $2`,
      [id, barbeariaId],
    );

    if (!linhas.length) {
      throw new NotFoundException('Registro de conhecimento não encontrado.');
    }
  }

  private async buscarPorId(id: string, barbeariaId: string) {
    const linhas = await this.dataSource.query(
      `SELECT id, barbearia_id, question, answer, status, metadata, created_at
       FROM documents
       WHERE id = $1 AND barbearia_id = $2`,
      [id, barbeariaId],
    );

    const linha = (linhas as LinhaConhecimento[])[0];
    if (!linha) {
      throw new NotFoundException('Registro de conhecimento não encontrado.');
    }
    return this.transformarLinha(linha);
  }

  private transformarLinha(linha: LinhaConhecimento) {
    return {
      id: String(linha.id),
      barbeariaId: linha.barbearia_id,
      pergunta: linha.question,
      resposta: linha.answer,
      ativo: linha.status,
      metadados: linha.metadata,
      criadoEm: linha.created_at,
    };
  }
}
