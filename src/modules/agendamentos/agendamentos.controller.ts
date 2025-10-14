import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AgendamentosService, CreateAgendamentoDto } from './agendamentos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('agendamentos')
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
}
