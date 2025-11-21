import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profissional } from './profissionais.entity';
import { ProfissionaisService } from './profissionais.service';
import { ProfissionaisController } from './profissionais.controller';
import { ProfissionalHorario } from './profissional-horario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Profissional, ProfissionalHorario])],
  providers: [ProfissionaisService],
  controllers: [ProfissionaisController],
  exports: [ProfissionaisService],
})
export class ProfissionaisModule {}
