import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { AtualizarConhecimentoDto, CriarConhecimentoDto } from './dto/conhecimento.dto';
import { SalvarConfiguracaoAgenteDto } from './dto/configuracao-agente.dto';
import { AtualizarStatusEvolutionDto } from './dto/evolution-status.dto';

import { UpsertChatStatusDto, GetChatStatusDto } from './dto/chat-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BuscarChatExternoDto } from './dto/buscar-chat-externo.dto';
import { RegistrarChatExternoDto } from './dto/registrar-chat-externo.dto';
import { ConsultarBarbeariaWebhookDto } from './dto/consultar-barbearia-webhook.dto';
import { EvolutionWebhookDto } from './dto/evolution-webhook.dto';

@Controller('ia')
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
  async perguntar(@Body() dto: PerguntarDto) {
    this.validarTokenOuErro(dto.token);
    return this.aiAgentService.perguntar(dto);
  }

  @Post('evolution/webhook')
  async evolutionWebhook(@Body() dto) {
    this.validarTokenOuErro(dto.token);
    return this.aiAgentService.processarEvolutionWebhook(dto);
  }

  @Post('barbearia-webhook')
  async consultarBarbeariaWebhook(@Body() dto: ConsultarBarbeariaWebhookDto) {
    return this.aiAgentService.consultarBarbeariaViaWebhook(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('treinar')
  async treinar(@Req() req, @Body() dto: TreinamentoDto) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    dto.barbeariaId = barbeariaId;
    return this.aiAgentService.treinar(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('base-conhecimento')
  async listarBase(@Req() req) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.aiAgentService.listarBaseConhecimento(barbeariaId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('base-conhecimento')
  async criarConhecimento(@Req() req, @Body() dto: CriarConhecimentoDto) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    dto.barbeariaId = barbeariaId;
    return this.aiAgentService.criarConhecimento(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('base-conhecimento/:id')
  async atualizarConhecimento(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: AtualizarConhecimentoDto,
  ) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.aiAgentService.atualizarConhecimento(id, barbeariaId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('base-conhecimento/:id')
  async removerConhecimento(@Param('id') id: string, @Req() req) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.aiAgentService.removerConhecimento(id, barbeariaId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('configuracao')
  async obterConfiguracao(@Req() req) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.aiAgentService.obterConfiguracaoAgente(barbeariaId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('configuracao')
  async salvarConfiguracao(@Req() req, @Body() dto: SalvarConfiguracaoAgenteDto) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.aiAgentService.salvarConfiguracaoAgente(barbeariaId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('configuracao/reset')
  async resetarConfiguracao(@Req() req) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.aiAgentService.resetarConfiguracaoAgente(barbeariaId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('historico')
  async listarHistorico(@Req() req, @Query('limite') limite = 20) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    const valorLimite = Number(limite) || 20;
    return this.aiAgentService.listarHistorico(barbeariaId, valorLimite);
  }

  @UseGuards(JwtAuthGuard)
  @Get('evolution/sessao')
  async buscarSessaoEvolution(@Req() req) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.aiAgentService.buscarSessaoEvolution(barbeariaId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('evolution/sessao')
  async criarSessaoEvolution(@Req() req) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    const sessao = await this.aiAgentService.buscarSessaoEvolution(barbeariaId).catch(() => undefined);
    if (sessao) {
      return sessao;
    }
    return this.aiAgentService.criarSessaoEvolution(barbeariaId);
  }

  @Post('evolution/status')
  async atualizarStatusEvolution(@Body() dto: AtualizarStatusEvolutionDto) {
    return this.aiAgentService.atualizarStatusEvolutionViaToken(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('evolution/status')
  async obterStatusEvolution(@Req() req) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.aiAgentService.obterStatusEvolution(barbeariaId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('evolution/instancia')
  async obterDetalhesInstancia(@Req() req) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.aiAgentService.obterDetalhesInstancia(barbeariaId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('evolution/instancia')
  async removerInstanciaEvolution(@Req() req) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.aiAgentService.removerInstanciaEvolution(barbeariaId);
  }

  @Post('chat-externo')
  async registrarChatExterno(@Body() dto: RegistrarChatExternoDto) {
    this.validarTokenOuErro(dto.token);
    return this.aiAgentService.registrarChatExterno(dto);
  }

  @Post('chat-externo-buscar')
  async registrarChatExternoBuscarPorId(@Body() dto: BuscarChatExternoDto) {
    this.validarTokenOuErro(dto.token);
    return this.aiAgentService.BuscarChatExterno(dto);
  }

  @Post('chat-status')
  async upsertChatStatus(@Body() dto: UpsertChatStatusDto) {
    this.validarTokenOuErro(dto.token);
    return this.aiAgentService.upsertChatStatus(dto);
  }

  @Get('chat-status')
  async obterChatStatus(@Query() dto: GetChatStatusDto) {
    this.validarTokenOuErro(dto.token);
    return this.aiAgentService.obterChatStatus(dto);
  }

  private barbeariaIdOuErro(req: any): string {
    const usuario = req?.user;
    if (!usuario || usuario.scope !== 'barbearia') {
      throw new ForbiddenException('Apenas contas de barbearia podem acessar este recurso.');
    }
    if (!usuario.sub) {
      throw new ForbiddenException('Identificador da barbearia nao encontrado no token.');
    }
    return String(usuario.sub);
  }

  private validarTokenOuErro(token?: string) {
    const esperado = process.env.CLIENTES_WEBHOOK_TOKEN ?? '';
    if (!token || !esperado || token !== esperado) {
      throw new ForbiddenException('Token invalido para acessar o RAG.');
    }
  }
}
