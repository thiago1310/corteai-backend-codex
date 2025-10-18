import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { BarbeariasService } from './barbearias.service';
import { CreateBarbeariaDTO, UpdateBarbeariaDTO } from './barbearia.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpsertHorarioFuncionamentoDTO } from './horario-funcionamento.dto';

@Controller('barbearias')
export class BarbeariasController {
  constructor(private readonly service: BarbeariasService) {}

  // @Post()
  // @UseGuards(JwtAuthGuard)
  // create(@Body() body: CreateBarbeariaDTO) {
  //   return this.service.create(body);
  // }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('link/:link')
  findByLink(@Param('link') link: string) {
    return this.service.findOneByLink(link);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateBarbeariaDTO,
    @Req() request,
  ) {
    console.log(request.user);
    if (id != request.user.sub) {
      throw new UnauthorizedException('Nao autorizado.');
    }
    return this.service.update(id, body);
  }

  @Get(':id/horarios')
  listHorarios(@Param('id') id: string) {
    return this.service.listHorarios(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/horarios')
  upsertHorarios(
    @Param('id') id: string,
    @Body() body: UpsertHorarioFuncionamentoDTO,
    @Req() request,
  ) {
    if (id != request.user.sub) {
      throw new UnauthorizedException('Nao autorizado.');
    }
    return this.service.replaceHorarios(id, body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
