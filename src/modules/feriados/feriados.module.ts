import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feriado } from './feriado.entity';
import { FeriadosService } from './feriados.service';
import { FeriadosController } from './feriados.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Feriado])],
  providers: [FeriadosService],
  controllers: [FeriadosController],
  exports: [FeriadosService],
})
export class FeriadosModule {}
