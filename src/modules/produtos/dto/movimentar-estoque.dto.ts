import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MovimentacaoTipo } from '../produto-movimentacao.entity';

export class MovimentarEstoqueDto {
  @IsString()
  @IsNotEmpty()
  produtoId!: string;

  @IsEnum(MovimentacaoTipo)
  tipo!: MovimentacaoTipo;

  @IsNumber()
  @Min(1)
  quantidade!: number;

  @IsOptional()
  @IsString()
  motivo?: string | null;

  @IsOptional()
  @IsString()
  referenciaAgendamentoItem?: string | null;
}
