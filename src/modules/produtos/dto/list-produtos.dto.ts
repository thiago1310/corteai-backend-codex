import { IsNotEmpty, IsString } from 'class-validator';

export class ListProdutosDto {
  @IsString()
  @IsNotEmpty()
  barbeariaId!: string;
}
