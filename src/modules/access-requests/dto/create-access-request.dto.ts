import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PermissionLevel } from 'src/common/enums/projects.enum';

export class CreateAccessRequestDto {
  /**
   * ID của Node (thư mục hoặc file) mà người dùng muốn xin quyền.
   * @example '6856a1b2c3d4e5f6g7h8i9j0'
   */
  @ApiProperty({
    description: 'ID của Node mà người dùng muốn xin quyền.',
    example: '6856a1b2c3d4e5f6g7h8i9j0',
  })
  @IsNotEmpty({ message: 'nodeId không được để trống.' })
  @IsMongoId({ message: 'nodeId phải là một ID hợp lệ của MongoDB.' })
    nodeId: string;

  /**
   * Cấp độ quyền mà người dùng yêu cầu.
   * Chỉ có thể là VIEWER hoặc EDITOR.
   */
  @ApiProperty({
    description: 'Cấp độ quyền yêu cầu.',
    enum: [PermissionLevel.VIEWER, PermissionLevel.EDITOR],
    example: PermissionLevel.VIEWER,
  })
  @IsNotEmpty({ message: 'Cấp độ quyền không được để trống.' })
  @IsEnum([PermissionLevel.VIEWER, PermissionLevel.EDITOR], {
    message: 'Cấp độ quyền chỉ có thể là VIEWER hoặc EDITOR.',
  })
    requestedPermission: PermissionLevel;

  /**
   * Áp dụng yêu cầu cho cả các thư mục con (nếu node là một thư mục).
   * Mặc định là false.
   */
  @ApiPropertyOptional({
    description: 'Áp dụng yêu cầu cho cả các thư mục con.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
    isRecursive?: boolean;

  /**
   * Lời nhắn gửi cho chủ sở hữu.
   */
  @ApiPropertyOptional({
    description: 'Lời nhắn tùy chọn gửi cho chủ sở hữu.',
    example: 'Chào bạn, vui lòng cấp cho tôi quyền xem tài liệu này.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
    message?: string;
}
