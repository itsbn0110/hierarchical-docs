// ========== 1. DTO mới: dto/permission-details.dto.ts ==========

import { Exclude, Expose, Transform, Type } from "class-transformer";
import { transformObjectId } from "src/common/helpers/transform.helpers";
import { NodeType, PermissionLevel } from "src/common/enums/projects.enum";

@Exclude()
export class PermissionDetailUserDto {
  @Expose()
  @Transform(transformObjectId)
  _id: string;

  @Expose()
  username: string;
}

@Exclude()
export class PermissionDetailNodeDto {
  @Expose()
  @Transform(transformObjectId)
  _id: string;

  @Expose()
  name: string;

  @Expose()
  type: NodeType;
}

@Exclude()
export class PermissionDetailsDto {
  @Expose()
  @Transform(transformObjectId)
  _id: string;

  @Expose()
  permission: PermissionLevel;

  @Expose()
  grantedAt: Date;

  @Expose()
  @Type(() => PermissionDetailUserDto)
  user: PermissionDetailUserDto;

  @Expose()
  @Type(() => PermissionDetailNodeDto)
  node: PermissionDetailNodeDto;

  @Expose()
  @Type(() => PermissionDetailUserDto)
  grantedBy: PermissionDetailUserDto;
}

export interface FindAllPermissionsOptions {
  page: number;
  limit: number;
  search?: string;
}
