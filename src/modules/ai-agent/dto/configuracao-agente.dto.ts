import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SalvarConfiguracaoAgenteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nomeAgente!: string;

  @IsString()
  @IsNotEmpty()
  promptSistema!: string;
}

export class ConfiguracaoAgenteDto {
  id!: string;
  barbeariaId!: string;
  nomeAgente!: string;
  promptSistema!: string;
  atualizadoEm!: Date;
}
