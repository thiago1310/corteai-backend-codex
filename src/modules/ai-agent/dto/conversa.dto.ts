import { IsJWT, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CriarConversaDto {
  @IsUUID()
  clienteId!: string;
}

export class RenovarTokenConversaDto {
  @IsJWT()
  tokenConversa!: string;
}

export class AtualizarDadosImportantesDto {
  dadosImportantes?: Record<string, unknown> | null;
}

export class ResponderConversaDto {
  @IsJWT()
  tokenConversa!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  instrucaoExtra?: string;
}
