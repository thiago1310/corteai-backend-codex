import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FidelidadeService } from './fidelidade.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('fidelidade')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class FidelidadeController {
  constructor(private readonly service: FidelidadeService) {}

  @UseGuards(JwtAuthGuard)
  @Post('config')
  setConfig(
    @Req() req,
    @Body() body: { percentual: number; valorMinimo: number; ativo: boolean },
  ) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.configurar(barbeariaId, body.percentual, body.valorMinimo, body.ativo);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cashback/creditar')
  creditar(
    @Req() req,
    @Body() body: { clienteId: string; valorBase: number },
  ) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.creditarCashback(barbeariaId, body.clienteId, body.valorBase);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cashback/debitar')
  debitar(
    @Req() req,
    @Body() body: { clienteId: string; valor: number },
  ) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.debitarCashback(barbeariaId, body.clienteId, body.valor);
  }

  @UseGuards(JwtAuthGuard)
  @Post('giftcards')
  emitir(
    @Req() req,
    @Body() body: { clienteId: string; valor: number; expiraEm?: string },
  ) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.converterParaGiftcard(barbeariaId, body.clienteId, body.valor, body.expiraEm);
  }

  @UseGuards(JwtAuthGuard)
  @Get('giftcards')
  listar(@Req() req, @Query('clienteId') clienteId?: string) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.listarGiftcards(barbeariaId, clienteId);
  }

  private barbeariaIdOuErro(req: any): string {
    const usuario = req?.user;
    if (!usuario || usuario.scope !== 'barbearia' || !usuario.sub) {
      throw new ForbiddenException('Apenas contas de barbearia podem acessar este recurso.');
    }
    return String(usuario.sub);
  }
}
