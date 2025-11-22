import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgendamentosController } from './agendamentos.controller';
import { AgendamentosService } from './agendamentos.service';
import { Agendamento } from './agendamentos.entity';
import { AgendamentoServico } from './agendamento-servicos.entity';
import { ProdutosModule } from '../produtos/produtos.module';
import { AgendamentoPagamento } from './pagamentos.entity';
import { FormasPagamentoModule } from '../formas-pagamento/formas-pagamento.module';
import { Recebimento } from './recebimento.entity';
import { ContaReceber } from './conta-receber.entity';
import { BloqueiosService } from './bloqueios.service';
import { BloqueiosController } from './bloqueios.controller';
import { BloqueioAgenda } from './bloqueio.entity';
import { BarbeariaEntity } from '../barbearias/barbearias.entity';
import { Profissional } from '../profissionais/profissionais.entity';
import { AgendaAutomaticaService } from './agenda-automatica.service';
import { HorarioFuncionamento } from '../barbearias/horario-funcionamento.entity';
import { FidelidadeModule } from '../fidelidade/fidelidade.module';
import { Feriado } from '../feriados/feriado.entity';
import { FeriadosModule } from '../feriados/feriados.module';
import { PoliticaCancelamento } from './politica-cancelamento.entity';
import { PoliticaCancelamentoService } from './politica-cancelamento.service';
import { PoliticaCancelamentoController } from './politica-cancelamento.controller';
import { ProfissionalHorario } from '../profissionais/profissional-horario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Agendamento,
      AgendamentoServico,
      AgendamentoPagamento,
      Recebimento,
      ContaReceber,
      BloqueioAgenda,
      BarbeariaEntity,
      Profissional,
      HorarioFuncionamento,
      Feriado,
      PoliticaCancelamento,
      ProfissionalHorario,
    ]),
    ProdutosModule,
    FormasPagamentoModule,
    FidelidadeModule,
    FeriadosModule,
  ],
  controllers: [AgendamentosController, BloqueiosController, PoliticaCancelamentoController],
  providers: [AgendamentosService, BloqueiosService, AgendaAutomaticaService, PoliticaCancelamentoService],
})
export class AgendamentosModule {}
