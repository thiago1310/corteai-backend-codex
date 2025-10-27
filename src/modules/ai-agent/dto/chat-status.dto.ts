import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertChatStatusDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  clienteId!: string;

  @IsIn([0, 1])
  status!: 0 | 1;

  @IsOptional()
  metadados?: Record<string, unknown>;
}

export class GetChatStatusDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  clienteId!: string;
}
