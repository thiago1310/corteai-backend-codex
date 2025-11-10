import { IsNotEmpty, IsUUID } from 'class-validator';

export class ListServicosDto {
  @IsUUID()
  @IsNotEmpty()
  barbeariaId!: string;
}
