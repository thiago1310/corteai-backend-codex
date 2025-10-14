import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lancamento } from './lancamentos.entity';
import { LancamentosService } from './lancamentos.service';
import { LancamentosController } from './lancamentos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Lancamento])],
  controllers: [LancamentosController],
  providers: [LancamentosService],
})
export class LancamentosModule {}
