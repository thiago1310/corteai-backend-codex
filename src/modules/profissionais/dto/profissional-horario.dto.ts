import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, Matches } from 'class-validator';
import { DiaSemana } from '../../barbearias/horario-funcionamento.entity';

export class ProfissionalHorarioItemDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsEnum(DiaSemana, { each: true })
  diasSemana!: DiaSemana[];

  @Matches(/^([0-1]\d|2[0-3]):[0-5]\d$/)
  abre!: string;

  @Matches(/^([0-1]\d|2[0-3]):[0-5]\d$/)
  fecha!: string;
}