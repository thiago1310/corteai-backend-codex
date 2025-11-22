import { Type } from 'class-transformer';
import {
  ArrayMinSize,
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

export class CreateProfissionalDto {
  @IsString()
  @MaxLength(150)
  nome!: string;

  @IsEmail()
  @MaxLength(150)
  email!: string;

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
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salarioBase?: number;

  @IsOptional()
  @MinLength(6)
  @MaxLength(120)
  senha?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProfissionalHorarioItemDto)
  horarios!: ProfissionalHorarioItemDto[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  servicosIds?: string[];
}
