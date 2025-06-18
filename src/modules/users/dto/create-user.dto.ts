import { IsEmail, IsString, IsNotEmpty, MinLength, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ErrorMessages } from 'src/common/filters/constants/messages.constant';

import { UserRole } from '../types/user-role.type';

export class CreateUserDto {
  @IsString({ message: ErrorMessages.INVALID_USERNAME })
  @IsNotEmpty({ message: ErrorMessages.USERNAME_REQUIRED })
  username: string;

  @IsEmail({}, { message: ErrorMessages.INVALID_EMAIL })
  @IsNotEmpty({ message: ErrorMessages.EMAIL_REQUIRED })
  email: string;

  @IsString({ message: ErrorMessages.INVALID_PASSWORD })
  @MinLength(8, { message: ErrorMessages.INVALID_PASSWORD })
  @IsNotEmpty({ message: ErrorMessages.PASSWORD_REQUIRED })
  password: string;

  @IsEnum(UserRole, { message: ErrorMessages.INVALID_ROLE })
  @IsNotEmpty({ message: ErrorMessages.ROLE_REQUIRED })
  role: UserRole;

  @IsBoolean({ message: ErrorMessages.VALIDATION_ERROR })
  @IsOptional() 
  isActive?: boolean;
}
