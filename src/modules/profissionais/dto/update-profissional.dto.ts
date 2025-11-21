import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProfissionalHorarioItemDto } from './profissional-horario.dto';

export class UpdateProfissionalDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nome?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  comissao?: number;

  @IsOptional()
  @MinLength(6)
  @MaxLength(120)
  senha?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfissionalHorarioItemDto)
  horarios?: ProfissionalHorarioItemDto[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  servicosIds?: string[];
}