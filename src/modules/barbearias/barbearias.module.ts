import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BarbeariaEntity } from './barbearias.entity';
import { HorarioFuncionamento } from './horario-funcionamento.entity';
import { BarbeariasService } from './barbearias.service';
import { BarbeariasController } from './barbearias.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BarbeariaEntity, HorarioFuncionamento])],
  providers: [BarbeariasService],
  controllers: [BarbeariasController],
  exports: [BarbeariasService],
})
export class BarbeariasModule {}
