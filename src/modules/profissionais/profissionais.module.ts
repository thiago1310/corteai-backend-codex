import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profissional } from './profissionais.entity';
import { ProfissionaisService } from './profissionais.service';
import { ProfissionaisController } from './profissionais.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Profissional])],
  providers: [ProfissionaisService],
  controllers: [ProfissionaisController],
  exports: [ProfissionaisService],
})
export class ProfissionaisModule {}
