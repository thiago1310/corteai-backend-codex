import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class PerguntarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  pergunta!: string;

  @IsUUID()
  barbeariaId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefoneCliente?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nomeCliente?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefoneBarbearia?: string;
}
