import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { BarbeariasService } from './barbearias.service';
import { CreateBarbeariaDTO } from './barbearia.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('barbearias')
export class BarbeariasController {
  constructor(private readonly service: BarbeariasService) { }

  @Post()
  create(@Body() body: CreateBarbeariaDTO) {
    return this.service.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.service.findAll();
  }


  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
