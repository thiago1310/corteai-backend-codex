import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ProfissionaisService, CreateProfissionalDto } from './profissionais.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('profissionais')
export class ProfissionaisController {
  constructor(private readonly service: ProfissionaisService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: CreateProfissionalDto) {
    return this.service.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.service.findAll();
  }
}
