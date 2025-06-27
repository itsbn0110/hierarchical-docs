import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ErrorMessages } from 'src/common/filters/constants/messages.constant';
import { UserRole } from 'src/common/enums/projects.enum';

export class CreateUserDto {
  /**
   * Tên đăng nhập của người dùng.
   * @example 'usertest01'
   */
  @ApiProperty({
    description: 'Tên đăng nhập của người dùng, phải là duy nhất.',
    example: 'usertest01',
  })
  @IsString({ message: ErrorMessages.INVALID_USERNAME })
  @IsNotEmpty({ message: ErrorMessages.USERNAME_REQUIRED })
  username: string;

  /**
   * Địa chỉ email của người dùng.
   * @example 'usertest01@example.com'
   */
  @ApiProperty({
    description: 'Địa chỉ email của người dùng, phải là duy nhất và đúng định dạng.',
    example: 'usertest01@example.com',
  })
  @IsEmail({}, { message: ErrorMessages.INVALID_EMAIL })
  @IsNotEmpty({ message: ErrorMessages.EMAIL_REQUIRED })
  email: string;

  /**
   * Vai trò của người dùng trong hệ thống.
   */
  @ApiProperty({
    description: 'Vai trò của người dùng.',
    enum: UserRole,
    example: UserRole.USER,
  })
  @IsEnum(UserRole, { message: ErrorMessages.INVALID_ROLE })
  @IsNotEmpty({ message: ErrorMessages.ROLE_REQUIRED })
  role: UserRole;

  /**
   * Trạng thái hoạt động của tài khoản. Mặc định là true.
   */
  @ApiPropertyOptional({
    description: 'Trạng thái hoạt động của tài khoản. Mặc định là true.',
    default: true,
  })
  @IsBoolean({ message: ErrorMessages.VALIDATION_ERROR })
  @IsOptional()
  isActive?: boolean;
}
