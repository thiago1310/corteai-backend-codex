import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { PerguntarDto } from './dto/perguntar.dto';
import { TreinamentoDto } from './dto/treinamento.dto';
import {
  AtualizarConhecimentoDto,
  ConsultaConhecimentoDto,
  CriarConhecimentoDto,
} from './dto/conhecimento.dto';

@Controller('ia')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) {}

  @Post('perguntar')
  async perguntar(@Body() dto: PerguntarDto) {
    return this.aiAgentService.perguntar(dto);
  }

  @Post('treinar')
  async treinar(@Body() dto: TreinamentoDto) {
    return this.aiAgentService.treinar(dto);
  }

  @Get('base-conhecimento')
  async listarBase(@Query() query: ConsultaConhecimentoDto) {
    return this.aiAgentService.listarBaseConhecimento(query.barbeariaId);
  }

  @Post('base-conhecimento')
  async criarConhecimento(@Body() dto: CriarConhecimentoDto) {
    return this.aiAgentService.criarConhecimento(dto);
  }

  @Patch('base-conhecimento/:id')
  async atualizarConhecimento(
    @Param('id') id: string,
    @Query() query: ConsultaConhecimentoDto,
    @Body() dto: AtualizarConhecimentoDto,
  ) {
    return this.aiAgentService.atualizarConhecimento(id, query.barbeariaId, dto);
  }

  @Delete('base-conhecimento/:id')
  async removerConhecimento(
    @Param('id') id: string,
    @Query() query: ConsultaConhecimentoDto,
  ) {
    return this.aiAgentService.removerConhecimento(id, query.barbeariaId);
  }

  @Get('historico')
  async listarHistorico(@Query('limite') limite = 20) {
    const valorLimite = Number(limite) || 20;
    return this.aiAgentService.listarHistorico(valorLimite);
  }
}
