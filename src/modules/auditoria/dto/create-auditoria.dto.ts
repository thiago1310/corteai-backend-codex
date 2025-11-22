import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAuditoriaDto {
  @IsString()
  @IsNotEmpty()
  barbeariaId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  tipo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenciaId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  usuarioId?: string | null;

  @IsOptional()
  @IsString()
  mensagem?: string | null;

  @IsOptional()
  payload?: Record<string, unknown> | null;
}
