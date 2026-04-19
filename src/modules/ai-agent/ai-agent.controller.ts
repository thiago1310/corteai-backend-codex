import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiAgentService } from './ai-agent.service';
import { AtualizarDadosImportantesDto, CriarConversaDto, RenovarTokenConversaDto, ResponderConversaDto } from './dto/conversa.dto';
import { SalvarConfiguracaoAgenteDto } from './dto/configuracao-agente.dto';
import { AtualizarDocumentoDto, CriarDocumentoDto } from './dto/documento.dto';
import { CriarMensagemDto } from './dto/mensagem.dto';

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

  @UseGuards(JwtAuthGuard)
  @Get('configuracao')
  obterConfiguracao(@Req() req: any) {
    return this.aiAgentService.obterConfiguracaoAgente(this.clienteIdOuErro(req));
  }

  @UseGuards(JwtAuthGuard)
  @Put('configuracao')
  salvarConfiguracao(@Req() req: any, @Body() dto: SalvarConfiguracaoAgenteDto) {
    return this.aiAgentService.salvarConfiguracaoAgente(this.clienteIdOuErro(req), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('documentos')
  listarDocumentos(@Req() req: any) {
    return this.aiAgentService.listarDocumentos(this.clienteIdOuErro(req));
  }

  @UseGuards(JwtAuthGuard)
  @Post('documentos')
  criarDocumento(@Req() req: any, @Body() dto: CriarDocumentoDto) {
    return this.aiAgentService.criarDocumento(this.clienteIdOuErro(req), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('documentos/:id')
  atualizarDocumento(@Req() req: any, @Param('id') id: string, @Body() dto: AtualizarDocumentoDto) {
    return this.aiAgentService.atualizarDocumento(id, this.clienteIdOuErro(req), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('documentos/:id')
  removerDocumento(@Req() req: any, @Param('id') id: string) {
    return this.aiAgentService.removerDocumento(id, this.clienteIdOuErro(req));
  }

  @Post('conversas')
  criarConversa(@Body() dto: CriarConversaDto, @Req() req: Request) {
    return this.aiAgentService.criarConversa(dto, this.identificadorOrigem(req));
  }

  @Post('conversas/renovar-token')
  renovarToken(@Body() dto: RenovarTokenConversaDto, @Req() req: Request) {
    return this.aiAgentService.renovarTokenConversa(dto, this.identificadorOrigem(req));
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversas/:id')
  obterConversa(@Req() req: any, @Param('id') id: string) {
    return this.aiAgentService.obterConversa(id, this.clienteIdOuErro(req));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('conversas/:id/dados-importantes')
  atualizarDadosImportantes(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AtualizarDadosImportantesDto,
  ) {
    return this.aiAgentService.atualizarDadosImportantes(id, this.clienteIdOuErro(req), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversas/:id/mensagens')
  listarMensagens(@Req() req: any, @Param('id') id: string) {
    return this.aiAgentService.listarMensagensConversa(id, this.clienteIdOuErro(req));
  }

  @Post('mensagens')
  criarMensagem(@Body() dto: CriarMensagemDto, @Req() req: Request) {
    return this.aiAgentService.criarMensagem(dto, this.identificadorOrigem(req));
  }

  @Post('conversas/:id/responder')
  responderConversa(@Param('id') id: string, @Body() dto: ResponderConversaDto, @Req() req: Request) {
    return this.aiAgentService.responderConversa(id, dto, this.identificadorOrigem(req));
  }

  private clienteIdOuErro(req: any) {
    const usuario = req?.user;
    if (!usuario || usuario.scope !== 'cliente' || !usuario.sub) {
      throw new ForbiddenException('Apenas contas de cliente podem acessar este recurso.');
    }
    return String(usuario.sub);
  }

  private identificadorOrigem(req: Request) {
    const encaminhado = req.headers['x-forwarded-for'];
    if (typeof encaminhado === 'string' && encaminhado.trim()) {
      return encaminhado.split(',')[0].trim();
    }

    if (Array.isArray(encaminhado) && encaminhado.length) {
      return encaminhado[0];
    }

    return req.ip || req.socket?.remoteAddress || 'origem-desconhecida';
  }
}
