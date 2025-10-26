import { IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateClienteDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsString()
  telefone!: string;

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
