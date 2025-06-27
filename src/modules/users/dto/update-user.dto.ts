import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { UserRole } from 'src/common/enums/projects.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
