import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProdutoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nome!: string;

  @IsOptional()
  @IsString()
  descricao?: string | null;

  @IsNumber()
  @Min(0)
  valor!: number;
}
