import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CriarEsperaDto {
  @IsString()
  @IsNotEmpty()
  barbeariaId!: string;

  @IsString()
  @IsNotEmpty()
  profissionalId!: string;

  @IsOptional()
  @IsString()
  clienteId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefone?: string;

  @IsDateString()
  dataDesejada!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  observacao?: string;
}
