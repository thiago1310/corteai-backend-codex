import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CriarDocumentoDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo?: string;

  @IsString()
  @IsNotEmpty()
  pergunta!: string;

  @IsString()
  @IsNotEmpty()
  resposta!: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  origem?: string;

  @IsOptional()
  @IsObject()
  metadados?: Record<string, unknown>;
}

export class AtualizarDocumentoDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo?: string;

  @IsOptional()
  @IsString()
  pergunta?: string;

  @IsOptional()
  @IsString()
  resposta?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  origem?: string;

  @IsOptional()
  @IsObject()
  metadados?: Record<string, unknown> | null;
}
