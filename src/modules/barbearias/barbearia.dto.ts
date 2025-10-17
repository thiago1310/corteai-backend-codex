import {
  IsBoolean,
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateBarbeariaDTO {
  @IsString()
  @Length(1, 150)
  nome!: string;

  @IsString()
  @Length(11, 14)
  cpfCnpj!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 255)
  senha!: string;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  telefone?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  dataNascimento?: string;

  @IsOptional()
  @IsBoolean()
  emailValidado?: boolean;

  @IsOptional()
  @IsBoolean()
  telefoneValidado?: boolean;

  @IsOptional()
  @IsBoolean()
  statusAberto?: boolean;

  @IsOptional()
  @IsISO8601({ strict: true })
  validadeLicenca?: string;

  @IsOptional()
  @IsString()
  @Length(0, 9)
  cep?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2)
  uf?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  cidade?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  bairro?: string;

  @IsOptional()
  @IsString()
  @Length(0, 150)
  rua?: string;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  numero?: string;
}

export class UpdateBarbeariaDTO {
  @IsOptional()
  @IsString()
  @Length(1, 150)
  nome?: string;

  @IsOptional()
  @IsString()
  @Length(11, 14)
  cpfCnpj?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  telefone?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  dataNascimento?: string;

  @IsOptional()
  @IsBoolean()
  emailValidado?: boolean;

  @IsOptional()
  @IsBoolean()
  telefoneValidado?: boolean;

  @IsOptional()
  @IsBoolean()
  statusAberto?: boolean;

  @IsOptional()
  @IsISO8601({ strict: true })
  validadeLicenca?: string;

  @IsOptional()
  @IsString()
  @Length(0, 9)
  cep?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2)
  uf?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  cidade?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  bairro?: string;

  @IsOptional()
  @IsString()
  @Length(0, 150)
  rua?: string;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  numero?: string;
}
