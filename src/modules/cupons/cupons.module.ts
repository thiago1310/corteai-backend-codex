import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuponsController } from './cupons.controller';
import { CuponsService } from './cupons.service';
import { Cupom } from './cupons.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cupom])],
  controllers: [CuponsController],
  providers: [CuponsService],
  exports: [CuponsService],
})
export class CuponsModule {}
