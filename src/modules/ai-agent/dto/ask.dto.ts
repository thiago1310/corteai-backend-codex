import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  question!: string;
}
