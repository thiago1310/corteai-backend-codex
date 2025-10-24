import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

export interface EvolutionInstance {
  instanceName: string;
  [key: string]: unknown;
}

interface CriarSessaoResponse {
  status?: string;
  instance?: Record<string, unknown>;
  qrcode?: {
    code?: string;
    base64?: string;
  };
  message?: string;
}

interface GerarQrcodeResponse {
  status?: string;
  code?: string;
  base64?: string;
  message?: string;
}

@Injectable()
export class EvolutionApiService {
  private readonly logger = new Logger(EvolutionApiService.name);
  private readonly apiUrl = process.env.EVOLUTION_API_URL ?? 'http://100.80.45.92:2121';
  private readonly apiKey = process.env.EVOLUTION_API_KEY ?? '';

  private ensureApiKey() {
    if (!this.apiKey) {
      throw new InternalServerErrorException('Chave da Evolution API nao configurada.');
    }
  }

  async buscarInstancias(): Promise<EvolutionInstance[]> {
    this.ensureApiKey();

    try {
      const resposta = await fetch(`${this.apiUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
      });

      if (!resposta.ok) {
        const texto = await resposta.text();
        this.logger.error(`Evolution API retornou status ${resposta.status}: ${texto}`);
        throw new InternalServerErrorException('Nao foi possivel consultar a Evolution API.');
      }

      const dados = (await resposta.json()).map((item) => item.instance);
      return dados ? dados : [];
    } catch (error) {
      const err = error as Error;
      this.logger.error('Falha ao comunicar com a Evolution API', err.stack);
      throw new InternalServerErrorException('Falha ao comunicar com a Evolution API.');
    }
  }

  async criarSessao(instanceName: string) {
    this.ensureApiKey();

    try {
      const resposta = await fetch(`${this.apiUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: JSON.stringify({
          instanceName,
          token: instanceName,
          integration: 'WHATSAPP-BAILEYS',
          qrcode: true,
          webhook: 'https://n8n.seu.dev.br/webhook/wp-thiago',
          webhook_base64: true,
          webhook_by_events: false,
          events: [
            'MESSAGES_SET',
            'MESSAGES_UPSERT',
            'SEND_MESSAGE',
            'CONNECTION_UPDATE',
          ],
          reject_call: false,
          msg_reject_call: '',
          always_online: false,
          read_messages: false,
          read_status: false,
          sync_full_history: false,
          ignore_groups: true,
        }),
      });

      const dados = (await resposta.json()) as CriarSessaoResponse;
      console.log(dados)
      if (!resposta.ok) {
        this.logger.error(
          `Falha ao criar sessao na Evolution API: ${resposta.status} - ${dados?.message}`,
        );
        throw new InternalServerErrorException('Nao foi possivel criar a sessao na Evolution API.');
      }

      return dados;
    } catch (error) {
      const err = error as Error;
      this.logger.error('Erro ao criar sessao na Evolution API', err.stack);
      throw new InternalServerErrorException('Falha ao criar sessao na Evolution API.');
    }
  }

  async gerarQrcode(instanceName: string) {
    if (!this.apiKey) {
      throw new InternalServerErrorException('Chave da Evolution API nao configurada.');
    }

    try {
      const resposta = await fetch(`${this.apiUrl}/instance/connect/${instanceName}`, {
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        }
      });

      const dados = (await resposta.json()) as GerarQrcodeResponse;

      if (!resposta.ok) {
        this.logger.error(
          `Falha ao gerar QRCode na Evolution API: ${resposta.status} - ${dados?.message}`,
        );
        throw new InternalServerErrorException('Nao foi possivel gerar o QRCode na Evolution API.');
      }
      console.log(dados)
      return dados;
    } catch (error) {
      const err = error as Error;
      this.logger.error('Erro ao gerar QRCode na Evolution API', err.stack);
      throw new InternalServerErrorException('Falha ao gerar QRCode na Evolution API.');
    }
  }

  async deletarInstancia(instanceName: string): Promise<void> {
    this.ensureApiKey();

    try {
      const resposta = await fetch(`${this.apiUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
      });

      if (!resposta.ok) {
        const texto = await resposta.text();
        this.logger.error(
          `Falha ao remover instancia na Evolution API: ${resposta.status} - ${texto}`,
        );
        throw new InternalServerErrorException('Nao foi possivel remover a instancia na Evolution API.');
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error('Erro ao remover instancia na Evolution API', err.stack);
      throw new InternalServerErrorException('Falha ao remover a instancia na Evolution API.');
    }
  }
}
