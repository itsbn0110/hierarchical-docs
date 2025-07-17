import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
  @ApiProperty({
    description: "Nhập email",
    example: "itsbn610@gmail.com",
  })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Mật khẩu của người dùng",
    example: "admin123",
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
