import { IsOptional, IsString } from 'class-validator';

export class BuscarClientesFiltroDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  telefone?: string;


}
