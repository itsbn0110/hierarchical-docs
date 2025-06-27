import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsEnum, IsNotEmpty } from 'class-validator';
import { PermissionLevel } from 'src/common/enums/projects.enum';

export class GrantPermissionDto {
  @ApiProperty({
    description: 'ID của người dùng được nhận quyền.',
    example: '6856b1c2d3e4f5g6h7i8j9k0',
  })
  @IsNotEmpty({ message: 'userId không được để trống.' })
  @IsMongoId({ message: 'userId phải là một ID hợp lệ.' })
  userId: string;

  @ApiProperty({
    description: 'ID của node (thư mục/file) được gán quyền.',
    example: '6856a1b2c3d4e5f6g7h8i9j0',
  })
  @IsNotEmpty({ message: 'nodeId không được để trống.' })
  @IsMongoId({ message: 'nodeId phải là một ID hợp lệ.' })
  nodeId: string;

  @ApiProperty({
    description: 'Cấp độ quyền được gán.',
    enum: PermissionLevel,
    example: PermissionLevel.EDITOR,
  })
  @IsEnum(PermissionLevel, { message: 'Cấp độ quyền không hợp lệ.' })
  @IsNotEmpty({ message: 'Cấp độ quyền không được để trống.' })
  permission: PermissionLevel;
}
