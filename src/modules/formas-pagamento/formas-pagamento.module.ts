import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormasPagamentoController } from './formas-pagamento.controller';
import { FormasPagamentoService } from './formas-pagamento.service';
import { FormaPagamento } from './formas-pagamento.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FormaPagamento])],
  controllers: [FormasPagamentoController],
  providers: [FormasPagamentoService],
  exports: [FormasPagamentoService],
})
export class FormasPagamentoModule {}
