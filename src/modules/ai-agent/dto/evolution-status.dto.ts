import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AtualizarStatusEvolutionDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  instanceName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  status!: string;
}
