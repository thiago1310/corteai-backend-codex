import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateFeriadoDto {
  @IsDateString()
  data!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nome!: string;
}
