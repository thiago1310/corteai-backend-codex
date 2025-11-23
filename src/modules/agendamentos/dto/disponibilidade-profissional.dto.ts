import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class DisponibilidadeProfissionalDto {
  @IsString()
  @IsNotEmpty()
  profissionalId!: string;

  @IsDateString()
  data!: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  intervaloMinutos?: number;

  @IsOptional()
  @IsString()
  servicoId?: string;
}
