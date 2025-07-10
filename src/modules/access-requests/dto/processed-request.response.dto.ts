import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { transformObjectId } from 'src/common/helpers/transform.helpers';
import { PermissionLevel, RequestStatus, NodeType } from 'src/common/enums/projects.enum';

@Exclude()
class ProcessedRequestNodeDto {
  @Expose()
  @Transform(transformObjectId)
  _id: string;

  @Expose()
  name: string;

  @Expose()
  type: NodeType;
}

@Exclude()
class ProcessedRequestUserDto {
  @Expose()
  @Transform(transformObjectId)
  _id: string;

  @Expose()
  username: string;
}

/**
 * DTO định nghĩa cấu trúc dữ liệu trả về cho một yêu cầu đã được xử lý.
 */
@Exclude()
export class ProcessedRequestDto {
  @Expose()
  @Transform(transformObjectId)
  _id: string;

  @Expose()
  requestedPermission: PermissionLevel;

  @Expose()
  status: RequestStatus;

  @Expose()
  isRecursive: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  reviewedAt: Date;

  @Expose()
  @Type(() => ProcessedRequestNodeDto)
  node: ProcessedRequestNodeDto;

  @Expose()
  @Type(() => ProcessedRequestUserDto)
  requester: ProcessedRequestUserDto;

  @Expose()
  @Type(() => ProcessedRequestUserDto)
  reviewer: ProcessedRequestUserDto;
}
