import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateCupomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  codigo!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentual?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorFixo?: number | null;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsDateString()
  expiraEm?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  limiteUso?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  limiteUsoPorCliente?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  categoria?: string | null;
}
