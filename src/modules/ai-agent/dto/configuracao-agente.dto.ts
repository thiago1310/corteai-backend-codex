import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

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
  @IsBoolean()
  ativo?: boolean;
}
