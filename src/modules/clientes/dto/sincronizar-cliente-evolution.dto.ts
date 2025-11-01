import { IsDateString, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class SincronizarClienteEvolutionDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  instanceName!: string;

  @ValidateIf((dto) => !dto.messageId)
  @IsString()
  @IsNotEmpty()
  telefone?: string;

  @ValidateIf((dto) => !dto.telefone)
  @IsString()
  @IsNotEmpty()
  messageId?: string;

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
