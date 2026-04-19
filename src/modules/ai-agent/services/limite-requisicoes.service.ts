import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface RegistroLimite {
  quantidade: number;
  expiraEm: number;
}

@Injectable()
export class LimiteRequisicoesService {
  private readonly registros = new Map<string, RegistroLimite>();

  verificarOuFalhar(chave: string, limite: number, janelaMs: number) {
    const agora = Date.now();
    const atual = this.registros.get(chave);

    if (!atual || atual.expiraEm <= agora) {
      this.registros.set(chave, {
        quantidade: 1,
        expiraEm: agora + janelaMs,
      });
      return;
    }

    if (atual.quantidade >= limite) {
      throw new HttpException('Limite de requisicoes excedido.', HttpStatus.TOO_MANY_REQUESTS);
    }

    atual.quantidade += 1;
    this.registros.set(chave, atual);
  }
}
