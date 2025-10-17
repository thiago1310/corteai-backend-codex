import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BarbeariaEntity } from './barbearias.entity';
import { BarbeariaHorarioEntity } from './barbearia-horarios.entity';
import { BarbeariasService } from './barbearias.service';
import { BarbeariasController } from './barbearias.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BarbeariaEntity, BarbeariaHorarioEntity])],
  providers: [BarbeariasService],
  controllers: [BarbeariasController],
  exports: [BarbeariasService],
})
export class BarbeariasModule {}
