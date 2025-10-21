import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { EmbeddingService } from './embedding.service';

interface RespostaRag {
  resposta: string;
  contextos: {
    id: string;
    question: string;
    answer: string;
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
      this.logger.warn('OPENAI_API_KEY não está definida. As respostas do RAG irão falhar.');
    }
  }

  async perguntar(pergunta: string, barbeariaId: string): Promise<RespostaRag> {
    const contextos = await this.embeddingService.buscarDocumentos(pergunta, barbeariaId);
    const contextoFormatado = contextos
      .map(
        (item, indice) =>
          `Contexto ${indice + 1} (similaridade ${item.similarity.toFixed(
            3,
          )}):\nPergunta: ${item.question}\nResposta: ${item.answer}`,
      )
      .join('\n\n');

    const prompt = `
Você é um atendente de barbearia. Utilize apenas os contextos abaixo para responder.
Se a informação não estiver presente, informe educadamente que não possui essa resposta.

Contextos disponíveis:
${contextoFormatado || 'Nenhum contexto encontrado.'}

Pergunta do usuário: ${pergunta}
`;

    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'Responda de forma objetiva, amigável e baseada nos contextos fornecidos. Caso não saiba, informe isso.',
          },
          { role: 'user', content: prompt },
        ],
      });

      const resposta = completion.choices[0]?.message?.content?.trim();
      if (!resposta) {
        throw new InternalServerErrorException('O modelo não retornou nenhuma resposta.');
      }

      return {
        resposta,
        contextos,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error('Falha ao buscar resposta com IA', err.stack);
      throw new InternalServerErrorException('Não foi possível gerar uma resposta.');
    }
  }
}
