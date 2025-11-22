import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFormaPagamentoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipo?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
