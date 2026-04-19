import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class UpdateClienteDto {
  @IsOptional()
  @IsString()
  @Length(1, 150)
  nome?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  telefone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  cpfCnpj?: string;

  @IsOptional()
  @IsString()
  @Length(0, 30)
  status?: string;

  @IsOptional()
  @IsString()
  @Length(0, 30)
  plano?: string;
}
