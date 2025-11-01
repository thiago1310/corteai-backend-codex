import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ConsultarBarbeariaWebhookDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsUUID()
  barbeariaId!: string;
}

