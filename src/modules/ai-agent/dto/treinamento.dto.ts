import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegistroTreinamentoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  pergunta!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  resposta!: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsObject()
  metadados?: Record<string, unknown> | null;
}

export class TreinamentoDto {
  @IsUUID()
  barbeariaId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => RegistroTreinamentoDto)
  registros!: RegistroTreinamentoDto[];

  @IsOptional()
  @IsString()
  @MaxLength(150)
  origem?: string;
}
