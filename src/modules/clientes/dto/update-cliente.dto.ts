import { IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateClienteDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  cpf?: string;


  @IsOptional()
  @IsDateString()
  dataCadastro?: string;

  @IsOptional()
  @IsDateString()
  dataAniversario?: string;
}
