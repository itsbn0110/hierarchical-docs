import { IsString, IsNotEmpty, Length } from 'class-validator';

export class UpdateNodeNameDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên không được để trống.' })
  @Length(1, 255)
  name: string;
}
