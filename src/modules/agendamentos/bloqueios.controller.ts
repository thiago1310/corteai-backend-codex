import {
  Body,
  Controller,
  Delete,
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
import { BloqueiosService } from './bloqueios.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateBloqueioDto } from './dto/create-bloqueio.dto';

@Controller('bloqueios')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class BloqueiosController {
  constructor(private readonly service: BloqueiosService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@Req() req, @Query('profissionalId') profissionalId?: string) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.list(barbeariaId, profissionalId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() body: CreateBloqueioDto) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.create({ ...body, barbeariaId });
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
