import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsString, IsNotEmpty, IsBoolean, IsOptional } from "class-validator";
import { ErrorMessages } from "src/common/filters/constants/messages.constant";

export class CreateUserDto {
  /**
   * Tên đăng nhập của người dùng.
   * @example 'usertest01'
   */
  @ApiProperty({
    description: "Tên đăng nhập của người dùng, phải là duy nhất.",
    example: "usertest01",
  })
  @IsString({ message: ErrorMessages.INVALID_USERNAME })
  @IsNotEmpty({ message: ErrorMessages.USERNAME_REQUIRED })
  username: string;

  /**
   * Địa chỉ email của người dùng.
   * @example 'usertest01@example.com'
   */
  @ApiProperty({
    description: "Địa chỉ email của người dùng, phải là duy nhất và đúng định dạng.",
    example: "usertest01@example.com",
  })
  @IsEmail({}, { message: ErrorMessages.INVALID_EMAIL })
  @IsNotEmpty({ message: ErrorMessages.EMAIL_REQUIRED })
  email: string;

  /**
   * Trạng thái hoạt động của tài khoản. Mặc định là true.
   */
  @ApiPropertyOptional({
    description: "Trạng thái hoạt động của tài khoản. Mặc định là true.",
    default: true,
  })
  @IsBoolean({ message: ErrorMessages.VALIDATION_ERROR })
  @IsOptional()
  isActive?: boolean;
}
