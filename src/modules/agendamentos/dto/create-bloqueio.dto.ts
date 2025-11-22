import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBloqueioDto {
  @IsString()
  @IsNotEmpty()
  barbeariaId!: string;

  @IsOptional()
  @IsString()
  profissionalId?: string;

  @IsDateString()
  inicio!: string;

  @IsDateString()
  fim!: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}
