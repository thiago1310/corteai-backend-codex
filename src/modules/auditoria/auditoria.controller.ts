import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';

@Controller('auditoria')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class AuditoriaController {
  constructor(private readonly service: AuditoriaService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Req() req, @Query('tipo') tipo?: string, @Query('referenciaId') referenciaId?: string) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.list(barbeariaId, { tipo, referenciaId });
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  registrar(@Req() req, @Body() body: CreateAuditoriaDto) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.registrar({ ...body, barbeariaId });
  }

  private barbeariaIdOuErro(req: any): string {
    const usuario = req?.user;
    if (!usuario || usuario.scope !== 'barbearia' || !usuario.sub) {
      throw new ForbiddenException('Apenas contas de barbearia podem acessar este recurso.');
    }
    return String(usuario.sub);
  }
}
