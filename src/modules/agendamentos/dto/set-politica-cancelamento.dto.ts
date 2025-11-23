import { IsInt, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class SetPoliticaCancelamentoDto {
  @IsInt()
  @Min(0)
  antecedenciaMinHoras!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  multaPercentual?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  multaValorFixo?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  limiteNoShow?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  limiteCancelamentoSemAviso?: number;
}
