import { ArrayNotEmpty, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class TrainDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(16000, { each: true })
  documents!: string[];

  @IsOptional()
  @IsString()
  source?: string;
}
