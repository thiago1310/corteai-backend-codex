import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Delete,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import {
  AddItensDto,
  AgendamentosService,
  CreateAgendamentoDto,
  UpdateAgendamentoStatusDto,
  UpdateItemDto,
  AddPagamentoDto,
} from './agendamentos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DisponibilidadeProfissionalDto } from './dto/disponibilidade-profissional.dto';
import { CriarEsperaDto } from './dto/criar-espera.dto';

@Controller('agendamentos')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class AgendamentosController {
  constructor(private readonly service: AgendamentosService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: CreateAgendamentoDto) {
    return this.service.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('profissionais/:id/disponibilidade')
  disponibilidade(@Param('id') id: string, @Query() query: DisponibilidadeProfissionalDto, @Req() req) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    const data = query.data ? new Date(query.data) : new Date();
    return this.service.getDisponibilidade(id, barbeariaId, data, query.intervaloMinutos, query.servicoId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/itens')
  addItens(@Param('id') id: string, @Body() body: AddItensDto) {
    return this.service.addItens(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/itens/:itemId')
  updateItem(@Param('id') id: string, @Param('itemId') itemId: string, @Body() body: UpdateItemDto) {
    return this.service.updateItem(id, itemId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/itens/:itemId/remove')
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.service.removeItem(id, itemId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: UpdateAgendamentoStatusDto) {
    return this.service.updateStatus(id, body.status);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/pagamentos')
  addPagamento(@Param('id') id: string, @Body() body: AddPagamentoDto) {
    return this.service.addPagamento(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/pagamentos/:pagamentoId/estorno')
  estornarPagamento(@Param('id') id: string, @Param('pagamentoId') pagamentoId: string) {
    return this.service.estornarPagamento(id, pagamentoId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profissionais/:id/espera')
  adicionarEspera(@Param('id') id: string, @Req() req, @Body() body: CriarEsperaDto) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.adicionarListaEspera({ ...body, profissionalId: id, barbeariaId });
  }

  @UseGuards(JwtAuthGuard)
  @Get('profissionais/:id/espera')
  listarEspera(@Param('id') id: string, @Req() req) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.service.listarListaEspera(id, barbeariaId);
  }

  private barbeariaIdOuErro(req: any): string {
    const usuario = req?.user;
    if (!usuario || usuario.scope !== 'barbearia' || !usuario.sub) {
      throw new ForbiddenException('Apenas contas de barbearia podem acessar este recurso.');
    }
    return String(usuario.sub);
  }
}
