import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContaPagar } from './contas-pagar.entity';
import { ContasPagarService } from './contas-pagar.service';
import { ContasPagarController } from './contas-pagar.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ContaPagar])],
  providers: [ContasPagarService],
  controllers: [ContasPagarController],
  exports: [ContasPagarService],
})
export class FinanceiroModule {}
