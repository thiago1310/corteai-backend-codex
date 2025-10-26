import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ClienteEntity } from './clientes.entity';
import { ClientesService } from './clientes.service';
import { ClientesController } from './clientes.controller';
import { ConexaoEvolutionEntity } from '../ai-agent/entities/conexao-evolution.entity';
import { ChatHistoryEntity } from '../ai-agent/entities/chat-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClienteEntity, ConexaoEvolutionEntity, ChatHistoryEntity])],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [ClientesService],
})
export class ClientesModule {}
