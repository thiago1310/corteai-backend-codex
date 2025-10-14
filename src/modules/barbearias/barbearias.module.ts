import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Barbearia } from './barbearias.entity';
import { BarbeariaHorario } from './barbearia-horarios.entity';
import { BarbeariasService } from './barbearias.service';
import { BarbeariasController } from './barbearias.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Barbearia, BarbeariaHorario])],
  providers: [BarbeariasService],
  controllers: [BarbeariasController],
  exports: [BarbeariasService],
})
export class BarbeariasModule {}
