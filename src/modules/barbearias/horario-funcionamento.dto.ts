import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { DiaSemana } from './horario-funcionamento.entity';

export class HorarioFuncionamentoItemDTO {
  @IsEnum(DiaSemana)
  diaSemana!: DiaSemana;

  @IsBoolean()
  ativo!: boolean;

  @Transform(({ value }) => (value === null ? undefined : value))
  @ValidateIf((value) => value.ativo)
  @Matches(/^([0-1]\d|2[0-3]):[0-5]\d$/, {
    message: 'abre deve estar no formato HH:mm',
  })
  abre?: string;

  @Transform(({ value }) => (value === null ? undefined : value))
  @ValidateIf((value) => value.ativo)
  @Matches(/^([0-1]\d|2[0-3]):[0-5]\d$/, {
    message: 'fecha deve estar no formato HH:mm',
  })
  fecha?: string;
}

export class UpsertHorarioFuncionamentoDTO {
  @IsArray()
  @ArrayMaxSize(70) // 7 dias com ate 10 intervalos
  @ValidateNested({ each: true })
  @Type(() => HorarioFuncionamentoItemDTO)
  horarios!: HorarioFuncionamentoItemDTO[];
}
