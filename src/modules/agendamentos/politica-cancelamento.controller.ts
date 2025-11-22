import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PoliticaCancelamentoService } from './politica-cancelamento.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SetPoliticaCancelamentoDto } from './dto/set-politica-cancelamento.dto';

@Controller('agendamentos/politica-cancelamento')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class PoliticaCancelamentoController {
  constructor(private readonly service: PoliticaCancelamentoService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  get(@Req() req) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.get(barbeariaId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  set(@Req() req, @Body() body: SetPoliticaCancelamentoDto) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.set(barbeariaId, body);
  }

  private barbeariaIdOuErro(req: any): string {
    const usuario = req?.user;
    if (!usuario || usuario.scope !== 'barbearia' || !usuario.sub) {
      throw new ForbiddenException('Apenas contas de barbearia podem acessar este recurso.');
    }
    return String(usuario.sub);
  }
}
