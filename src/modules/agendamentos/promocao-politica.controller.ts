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
import { PromocaoPoliticaService } from './promocao-politica.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SetPromocaoPoliticaDto } from './dto/set-promocao-politica.dto';

@Controller('promocoes/politica')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class PromocaoPoliticaController {
  constructor(private readonly service: PromocaoPoliticaService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  get(@Req() req) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.get(barbeariaId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  set(@Req() req, @Body() body: SetPromocaoPoliticaDto) {
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
