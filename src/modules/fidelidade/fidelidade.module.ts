import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FidelidadeConfig } from './fidelidade-config.entity';
import { CashbackSaldo } from './cashback-saldo.entity';
import { Giftcard } from './giftcard.entity';
import { FidelidadeService } from './fidelidade.service';
import { FidelidadeController } from './fidelidade.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FidelidadeConfig, CashbackSaldo, Giftcard])],
  providers: [FidelidadeService],
  controllers: [FidelidadeController],
  exports: [FidelidadeService],
})
export class FidelidadeModule {}
