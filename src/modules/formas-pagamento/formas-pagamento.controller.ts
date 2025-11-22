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
import { FormasPagamentoService } from './formas-pagamento.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateFormaPagamentoDto } from './dto/create-forma-pagamento.dto';
import { UpdateFormaPagamentoDto } from './dto/update-forma-pagamento.dto';

@Controller('formas-pagamento')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class FormasPagamentoController {
  constructor(private readonly service: FormasPagamentoService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.findAll(barbeariaId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() body: CreateFormaPagamentoDto) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.create(barbeariaId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Req() req, @Body() body: UpdateFormaPagamentoDto) {
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
