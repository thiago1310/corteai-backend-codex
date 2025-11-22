import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ContaPagarStatus } from '../contas-pagar.entity';

export class UpdateContaPagarDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  descricao?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  valor?: number;

  @IsOptional()
  @IsEnum(ContaPagarStatus)
  status?: ContaPagarStatus;

  @IsOptional()
  @IsDateString()
  vencimento?: string | null;

  @IsOptional()
  @IsDateString()
  pagamentoEm?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  categoria?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  centroCusto?: string | null;
}
