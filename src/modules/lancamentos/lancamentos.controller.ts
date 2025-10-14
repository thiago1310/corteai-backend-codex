import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { LancamentosService, CreateLancamentoDto } from './lancamentos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('lancamentos')
export class LancamentosController {
  constructor(private readonly service: LancamentosService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: CreateLancamentoDto) {
    return this.service.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.service.findAll();
  }
}
