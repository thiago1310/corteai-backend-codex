import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgendamentosController } from './agendamentos.controller';
import { AgendamentosService } from './agendamentos.service';
import { Agendamento } from './agendamentos.entity';
import { AgendamentoServico } from './agendamento-servicos.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Agendamento, AgendamentoServico])],
  controllers: [AgendamentosController],
  providers: [AgendamentosService],
})
export class AgendamentosModule {}
