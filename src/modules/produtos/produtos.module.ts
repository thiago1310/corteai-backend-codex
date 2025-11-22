import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Produto } from './produtos.entity';
import { ProdutosController } from './produtos.controller';
import { ProdutosService } from './produtos.service';
import { ProdutoMovimentacao } from './produto-movimentacao.entity';
import { EstoqueService } from './estoque.service';

@Module({
  imports: [TypeOrmModule.forFeature([Produto, ProdutoMovimentacao])],
  controllers: [ProdutosController],
  providers: [ProdutosService, EstoqueService],
  exports: [ProdutosService, EstoqueService],
})
export class ProdutosModule {}
