// src/nodes/dto/create-node.dto.ts

import { IsString, IsNotEmpty, IsEnum, IsOptional, IsMongoId } from 'class-validator';
import { NodeType } from 'src/common/enums/projects.enum';

export class CreateNodeDto {
  @IsString({ message: 'Tên không được để trống' })
  @IsNotEmpty()
  name: string;

  @IsEnum(NodeType, { message: 'Loại node không hợp lệ. Chỉ chấp nhận FOLDER hoặc FILE.' })
  @IsNotEmpty()
  type: NodeType;

  @IsOptional()
  @IsMongoId({ message: 'parentId phải là một ID hợp lệ của MongoDB.' })
  parentId: string | null;

  @IsOptional()
  @IsString()
  content?: string;
}