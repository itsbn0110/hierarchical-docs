import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChangePasswordDto {
  @ApiProperty({
    description: "Mật khẩu cũ của người dùng",
    required: false,
    example: "oldPassword123",
  })
  @IsString()
  oldPassword?: string;

  @ApiProperty({
    description: "Mật khẩu mới (tối thiểu 8 ký tự)",
    example: "newStrongPassword456",
  })
  @IsString()
  @MinLength(8, { message: "Mật khẩu mới phải có ít nhất 8 ký tự" })
  newPassword: string;
}
