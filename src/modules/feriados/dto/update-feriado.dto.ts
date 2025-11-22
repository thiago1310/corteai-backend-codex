import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFeriadoDto {
  @IsOptional()
  @IsDateString()
  data?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nome?: string;
}
