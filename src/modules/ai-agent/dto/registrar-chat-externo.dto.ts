import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RegistrarChatExternoDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsIn(['user', 'assistant', "assistant manual"])
  role!: 'user' | 'assistant' | 'assistant manual';

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content!: string;

  @IsOptional()
  @IsUUID()
  barbeariaId?: string;


  @IsOptional()
  @IsString()
  messageId?: string;

  @IsOptional()
  @IsString()
  telefoneBarbearia?: string;

  @IsOptional()
  @IsString()
  telefoneCliente?: string;
}
