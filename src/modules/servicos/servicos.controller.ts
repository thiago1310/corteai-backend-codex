import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ServicosService } from './servicos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateServicoDto } from './dto/create-servico.dto';
import { UpdateServicoDto } from './dto/update-servico.dto';
import { FilterServicosDto } from './dto/filter-servicos.dto';
import { ListServicosDto } from './dto/list-servicos.dto';

@Controller('servicos')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class ServicosController {
  constructor(private readonly service: ServicosService) {}

  @Get()
  findAll(@Query() query: ListServicosDto) {
    return this.service.findAll(query.barbeariaId);
  }

  @Get('busca')
  search(@Query() query: FilterServicosDto) {
    return this.service.search(query);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() body: CreateServicoDto) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.create(barbeariaId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Req() req, @Body() body: UpdateServicoDto) {
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
