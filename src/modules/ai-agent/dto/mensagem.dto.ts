import { IsJWT, IsString, MaxLength } from 'class-validator';

export class CriarMensagemDto {
  @IsJWT()
  tokenConversa!: string;

  @IsString()
  @MaxLength(4000)
  mensagem!: string;
}
