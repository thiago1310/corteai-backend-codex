import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FeriadosService } from './feriados.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateFeriadoDto } from './dto/create-feriado.dto';
import { UpdateFeriadoDto } from './dto/update-feriado.dto';

@Controller('feriados')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class FeriadosController {
  constructor(private readonly service: FeriadosService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Req() req) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.list(barbeariaId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() body: CreateFeriadoDto) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.create(barbeariaId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Req() req, @Body() body: UpdateFeriadoDto) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.update(id, barbeariaId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.remove(id, barbeariaId);
  }

  private barbeariaIdOuErro(req: any): string {
    const usuario = req?.user;
    if (!usuario || usuario.scope !== 'barbearia' || !usuario.sub) {
      throw new ForbiddenException('Apenas contas de barbearia podem acessar este recurso.');
    }
    return String(usuario.sub);
  }
}
