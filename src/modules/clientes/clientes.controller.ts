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

import { ClientesService } from './clientes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { BuscarClientesFiltroDto } from './dto/buscar-clientes.dto';
import { SincronizarClienteEvolutionDto } from './dto/sincronizar-cliente-evolution.dto';

@Controller('clientes')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async criar(@Req() req, @Body() dto: CreateClienteDto) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.clientesService.criar(barbeariaId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listar(@Req() req, @Query() filtro: BuscarClientesFiltroDto) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.clientesService.listar(barbeariaId, filtro);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async obterPorId(@Req() req, @Param('id') id: string) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.clientesService.buscarPorId(barbeariaId, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async atualizar(@Req() req, @Param('id') id: string, @Body() dto: UpdateClienteDto) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.clientesService.atualizar(barbeariaId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remover(@Req() req, @Param('id') id: string) {
    const barbeariaId = this.barbeariaIdOuErro(req);
    return this.clientesService.remover(barbeariaId, id);
  }

  @Post('evolution/sincronizar')
  async sincronizarComEvolution(@Body() dto: SincronizarClienteEvolutionDto) {
    return this.clientesService.sincronizarComEvolution(dto);
  }

  private barbeariaIdOuErro(req: any): string {
    const usuario = req?.user;
    if (!usuario || usuario.scope !== 'barbearia' || !usuario.sub) {
      throw new ForbiddenException('Recurso permitido apenas para barbearias autenticadas.');
    }
    return String(usuario.sub);
  }
}
