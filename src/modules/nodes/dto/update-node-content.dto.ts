import { IsString } from 'class-validator';

export class UpdateNodeContentDto {
  @IsString()
  content: string;
}