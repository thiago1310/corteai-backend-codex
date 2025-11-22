import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MetricasProfissionalDto {
  @IsString()
  @IsNotEmpty()
  barbeariaId!: string;

  @IsOptional()
  @IsDateString()
  inicio?: string;

  @IsOptional()
  @IsDateString()
  fim?: string;
}
