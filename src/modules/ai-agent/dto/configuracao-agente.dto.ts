import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class SalvarConfiguracaoAgenteDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nomeAgente?: string;

  @IsOptional()
  @IsString()
  mensagemBoasVindas?: string;

  @IsOptional()
  @IsString()
  promptSistema?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tomResposta?: string;

  @IsOptional()
  @IsString()
  instrucoesExtras?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limiteMaximoMensagensPorConversa?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
