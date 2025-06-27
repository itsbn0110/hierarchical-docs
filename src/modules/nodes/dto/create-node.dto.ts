import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsMongoId } from 'class-validator';
import { NodeType } from 'src/common/enums/projects.enum';

export class CreateNodeDto {
  @ApiProperty({
    description: 'Tên của node (thư mục hoặc file).',
    example: 'Báo cáo Quý 4',
  })
  @IsString({ message: 'Tên không được để trống' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Loại của node.',
    enum: NodeType,
    example: NodeType.FOLDER,
  })
  @IsEnum(NodeType, { message: 'Loại node không hợp lệ. Chỉ chấp nhận FOLDER hoặc FILE.' })
  @IsNotEmpty()
  type: NodeType;

  @ApiPropertyOptional({
    description: 'ID của thư mục cha. Để trống hoặc gửi null để tạo ở cấp gốc.',
    example: '6859296c37146268509a94b9',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsMongoId({ message: 'parentId phải là một ID hợp lệ của MongoDB.' })
  parentId: string | null;

  @ApiPropertyOptional({
    description: 'Nội dung văn bản, chỉ áp dụng khi type là FILE.',
    example: 'Đây là nội dung của tài liệu...',
  })
  @IsOptional()
  @IsString()
  content?: string;
}
