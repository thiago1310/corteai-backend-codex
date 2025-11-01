import { IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class EvolutionWebhookMessageDto {
  @IsOptional()
  @IsString()
  chat_id?: string;

  @IsOptional()
  @IsString()
  chatId?: string;

  @IsOptional()
  @IsString()
  content_type?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  timestamp?: string;

  @IsOptional()
  @IsString()
  content_url?: string;

  @IsOptional()
  @IsString()
  event?: string;
}

export class EvolutionWebhookBodyDto {
  @IsOptional()
  @IsString()
  event?: string;

  @IsOptional()
  @IsString()
  Telefone?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  NomeWhatsapp?: string;

  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  Instance?: string;

  @IsOptional()
  @IsString()
  instance?: string;

  @IsOptional()
  @IsString()
  InstanceName?: string;

  @IsOptional()
  @IsString()
  messageId?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  key?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  token?: string;
}

export class EvolutionWebhookDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EvolutionWebhookMessageDto)
  message?: EvolutionWebhookMessageDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EvolutionWebhookBodyDto)
  body?: EvolutionWebhookBodyDto;

  @IsOptional()
  @IsString()
  messageId?: string;
}
