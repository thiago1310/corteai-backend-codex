import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { BarbeariasService, CreateBarbeariaDto } from './barbearias.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('barbearias')
export class BarbeariasController {
  constructor(private readonly service: BarbeariasService) {}

  @Post()
  create(@Body() body: CreateBarbeariaDto) {
    return this.service.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
