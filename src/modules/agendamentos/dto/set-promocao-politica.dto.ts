import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class SetPromocaoPoliticaDto {
  @IsOptional()
  @IsBoolean()
  permitirCupomCashback?: boolean;

  @IsOptional()
  @IsBoolean()
  permitirGiftcardCashback?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  limiteUsoPeriodoDias?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  limiteUsoPeriodo?: number;
}
