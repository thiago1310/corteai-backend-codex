import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { EmbeddingService } from './embedding.service';

interface AskResponse {
  answer: string;
  contexts: {
    id: string;
    content: string;
    metadata: Record<string, unknown> | null;
    similarity: number;
  }[];
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  constructor(private readonly embeddingService: EmbeddingService) {
    if (!process.env.OPENAI_API_KEY) {
      this.logger.warn('OPENAI_API_KEY is not set – RAG responses will fail.');
    }
  }

  async ask(question: string): Promise<AskResponse> {
    const contexts = await this.embeddingService.searchDocuments(question);
    const contextString = contexts
      .map(
        (item, index) =>
          `Contexto ${index + 1} (similaridade ${item.similarity.toFixed(3)}):\n${item.content}`,
      )
      .join('\n\n');

    const prompt = `
Você é um assistente especializado em barbearias. Use estritamente os contextos fornecidos para responder à pergunta.
Se a informação não estiver clara no contexto, admita que não sabe.

Contextos disponíveis:
${contextString || 'Nenhum contexto encontrado.'}

Pergunta do usuário: ${question}
`;

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Você é um atendente de barbearia. Responda de forma objetiva, amigável e baseada nos documentos fornecidos.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      });

      const answer = completion.choices[0]?.message?.content?.trim();
      if (!answer) {
        throw new InternalServerErrorException('Modelo não retornou resposta.');
      }

      return { answer, contexts };
    } catch (error) {
      const err = error as Error;
      this.logger.error('Failed to generate RAG answer', err.stack);
      throw new InternalServerErrorException('Falha ao gerar resposta com IA.');
    }
  }

  async train(documents: string[], metadata?: Record<string, unknown>): Promise<void> {
    const batches = documents.flatMap((doc) => this.chunkDocument(doc)).filter((chunk) => chunk.length > 0);
    for (const chunk of batches) {
      await this.embeddingService.storeDocument(chunk, metadata);
    }
  }

  private chunkDocument(text: string, chunkSize = 1200, overlap = 100): string[] {
    const sanitized = text.replace(/\s+/g, ' ').trim();
    if (sanitized.length <= chunkSize) {
      return [sanitized];
    }

    const chunks: string[] = [];
    let start = 0;
    while (start < sanitized.length) {
      const end = Math.min(start + chunkSize, sanitized.length);
      const chunk = sanitized.slice(start, end);
      chunks.push(chunk);
      if (end === sanitized.length) {
        break;
      }
      start = end - overlap;
    }
    return chunks;
  }
}
