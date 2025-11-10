import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateServicoDto {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  nome?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  descricao?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  valor?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  tempoEstimado?: number;
}