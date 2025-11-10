import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ListServicosDto } from './list-servicos.dto';

export class FilterServicosDto extends ListServicosDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descricao?: string;
}
