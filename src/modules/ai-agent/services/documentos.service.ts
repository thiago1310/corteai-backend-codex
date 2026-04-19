import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AtualizarDocumentoDto, CriarDocumentoDto } from '../dto/documento.dto';
import { DocumentoAtualizacao, DocumentoInput, EmbeddingService } from './embedding.service';

interface LinhaDocumento {
  id: string;
  cliente_id: string;
  titulo: string | null;
  pergunta: string;
  resposta: string;
  conteudo: string;
  metadados: Record<string, unknown> | null;
  ativo: boolean;
  origem: string | null;
  criado_em: Date;
  atualizado_em: Date;
}

@Injectable()
export class DocumentosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async listar(clienteId: string) {
    const linhas = await this.dataSource.query(
      `SELECT id, cliente_id, titulo, pergunta, resposta, conteudo, metadados, ativo, origem, criado_em, atualizado_em
       FROM documentos
       WHERE cliente_id = $1
       ORDER BY criado_em DESC`,
      [clienteId],
    );
    return (linhas as LinhaDocumento[]).map((linha) => this.transformarLinha(linha));
  }

  async criar(clienteId: string, dto: CriarDocumentoDto) {
    if (!clienteId) {
      throw new BadRequestException('Identificador do cliente e obrigatorio.');
    }

    const entrada: DocumentoInput = {
      clienteId,
      titulo: dto.titulo ?? null,
      pergunta: dto.pergunta,
      resposta: dto.resposta,
      ativo: dto.ativo ?? true,
      origem: dto.origem ?? 'painel',
      metadados: dto.metadados ?? null,
    };

    const id = await this.embeddingService.criarDocumento(entrada);
    return this.buscarPorId(id, clienteId);
  }

  async atualizar(id: string, clienteId: string, dto: AtualizarDocumentoDto) {
    const atualizacao: DocumentoAtualizacao = {
      titulo: dto.titulo,
      pergunta: dto.pergunta,
      resposta: dto.resposta,
      ativo: dto.ativo,
      origem: dto.origem,
      metadados: dto.metadados,
    };

    await this.embeddingService.atualizarDocumento(id, clienteId, atualizacao);
    return this.buscarPorId(id, clienteId);
  }

  async remover(id: string, clienteId: string) {
    await this.buscarPorId(id, clienteId);
    await this.embeddingService.excluirDocumento(id, clienteId);
    return { removido: true };
  }

  async buscarPorId(id: string, clienteId: string) {
    const linhas = await this.dataSource.query(
      `SELECT id, cliente_id, titulo, pergunta, resposta, conteudo, metadados, ativo, origem, criado_em, atualizado_em
       FROM documentos
       WHERE id = $1 AND cliente_id = $2`,
      [id, clienteId],
    );
    const linha = (linhas as LinhaDocumento[])[0];
    if (!linha) {
      throw new NotFoundException('Documento nao encontrado.');
    }
    return this.transformarLinha(linha);
  }

  private transformarLinha(linha: LinhaDocumento) {
    return {
      id: String(linha.id),
      clienteId: linha.cliente_id,
      titulo: linha.titulo,
      pergunta: linha.pergunta,
      resposta: linha.resposta,
      conteudo: linha.conteudo,
      metadados: linha.metadados,
      ativo: linha.ativo,
      origem: linha.origem,
      criadoEm: linha.criado_em,
      atualizadoEm: linha.atualizado_em,
    };
  }
}
