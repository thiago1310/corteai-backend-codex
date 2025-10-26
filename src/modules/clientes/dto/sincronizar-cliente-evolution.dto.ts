import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SincronizarClienteEvolutionDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  instanceName!: string;

  @IsString()
  @IsNotEmpty()
  telefone!: string;

  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsDateString()
  dataAniversario?: string;
}
