import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ServicosService, CreateServicoDto } from './servicos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('servicos')
export class ServicosController {
  constructor(private readonly service: ServicosService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: CreateServicoDto) {
    return this.service.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.service.findAll();
  }
}
