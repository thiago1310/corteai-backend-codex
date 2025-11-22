import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Produto } from './produtos.entity';
import { ProdutoMovimentacao, MovimentacaoTipo } from './produto-movimentacao.entity';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { MovimentarEstoqueDto } from './dto/movimentar-estoque.dto';

@Injectable()
export class EstoqueService {
  constructor(
    @InjectRepository(Produto) private readonly produtoRepo: Repository<Produto>,
    @InjectRepository(ProdutoMovimentacao) private readonly movRepo: Repository<ProdutoMovimentacao>,
  ) {}

  async movimentar(barbeariaId: string, dto: MovimentarEstoqueDto) {
    const produto = await this.produtoRepo.findOne({
      where: { id: dto.produtoId },
      relations: ['barbearia'],
    });
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }
    if (!produto.barbearia || produto.barbearia.id !== barbeariaId) {
      throw new BadRequestException('Produto não pertence à barbearia informada');
    }

    const novoSaldo = this.calcularSaldo(produto.estoqueAtual, dto.tipo, dto.quantidade);
    if (novoSaldo < 0) {
      throw new BadRequestException('Saldo insuficiente para saída de estoque');
    }

    produto.estoqueAtual = novoSaldo;
    await this.produtoRepo.save(produto);

    const barbearia = produto.barbearia ?? ({ id: barbeariaId } as BarbeariaEntity);

    const mov = this.movRepo.create({
      produto,
      barbearia,
      tipo: dto.tipo,
      quantidade: dto.quantidade,
      motivo: dto.motivo ?? null,
      referenciaAgendamentoItem: dto.referenciaAgendamentoItem ?? null,
    });
    await this.movRepo.save(mov);
    return { saldo: produto.estoqueAtual };
  }

  private calcularSaldo(atual: number, tipo: MovimentacaoTipo, quantidade: number) {
    if (tipo === MovimentacaoTipo.ENTRADA) return atual + quantidade;
    if (tipo === MovimentacaoTipo.SAIDA) return atual - quantidade;
    // AJUSTE: quantidade positivo adiciona, negativo remove (caller deve mandar sinal correto)
    return atual + quantidade;
  }
}
