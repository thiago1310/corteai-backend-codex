import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { PerguntarDto } from './dto/perguntar.dto';
import { TreinamentoDto } from './dto/treinamento.dto';
import {
  AtualizarConhecimentoDto,
  CriarConhecimentoDto,
} from './dto/conhecimento.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ia')
@UseGuards(JwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) { }

  @Post('perguntar')
  async perguntar(@Req() req, @Body() dto: PerguntarDto) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    dto.barbeariaId = barbeariaId;
    return this.aiAgentService.perguntar(dto);
  }

  @Post('treinar')
  async treinar(@Req() req, @Body() dto: TreinamentoDto) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    dto.barbeariaId = barbeariaId;
    return this.aiAgentService.treinar(dto);
  }

  @Get('base-conhecimento')
  async listarBase(@Req() req) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.aiAgentService.listarBaseConhecimento(barbeariaId);
  }

  @Post('base-conhecimento')
  async criarConhecimento(@Req() req, @Body() dto: CriarConhecimentoDto) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    dto.barbeariaId = barbeariaId;
    return this.aiAgentService.criarConhecimento(dto);
  }

  @Patch('base-conhecimento/:id')
  async atualizarConhecimento(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: AtualizarConhecimentoDto,
  ) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.aiAgentService.atualizarConhecimento(id, barbeariaId, dto);
  }

  @Delete('base-conhecimento/:id')
  async removerConhecimento(
    @Param('id') id: string,
    @Req() req,
  ) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.aiAgentService.removerConhecimento(id, barbeariaId);
  }

  @Get('historico')
  async listarHistorico(@Req() req, @Query('limite') limite = 20) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    const valorLimite = Number(limite) || 20;
    return this.aiAgentService.listarHistorico(barbeariaId, valorLimite);
  }

  @Get('evolution/sessao')
  async buscarSessaoEvolution(@Req() req) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.aiAgentService.buscarSessaoEvolution(barbeariaId);
  }

  @Post('evolution/sessao')
  async criarSessaoEvolution(@Req() req) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.aiAgentService.criarSessaoEvolution(barbeariaId);
  }

  private barbeariaIdOuErro(req: any): string {
    const usuario = req?.user;
    if (!usuario || usuario.scope !== 'barbearia') {
      throw new ForbiddenException('Apenas contas de barbearia podem acessar este recurso.');
    }
    if (!usuario.sub) {
      throw new ForbiddenException('Identificador da barbearia nÃ£o encontrado no token.');
    }
    return String(usuario.sub);
  }
}



