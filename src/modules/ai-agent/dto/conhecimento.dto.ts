import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CriarConhecimentoDto {
  @IsOptional()
  @IsUUID()
  barbeariaId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  pergunta!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  resposta!: string;

  @IsBoolean()
  ativo!: boolean;

  @IsOptional()
  @IsObject()
  metadados?: Record<string, unknown> | null;
}

export class AtualizarConhecimentoDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  pergunta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  resposta?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsObject()
  metadados?: Record<string, unknown> | null;
}

export class ConsultaConhecimentoDto {}
