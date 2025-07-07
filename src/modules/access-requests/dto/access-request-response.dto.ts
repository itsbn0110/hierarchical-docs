import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { ObjectId } from 'mongodb';
import { PermissionLevel } from 'src/common/enums/projects.enum';
import { transformObjectId } from 'src/common/helpers/transform.helpers';

// DTO con để chứa thông tin cơ bản của Node
class NodeInfo {
  @Expose()
  _id: string;

  @Expose()
  name: string;

  @Expose()
  type: 'FOLDER' | 'FILE';
}

// DTO con để chứa thông tin cơ bản của người yêu cầu
class RequesterInfo {
  @Expose()
  _id: string;

  @Expose()
  username: string;
}

/**
 * DTO này định nghĩa cấu trúc dữ liệu trả về cho mỗi yêu cầu đang chờ xử lý.
 */
@Exclude()
export class PendingRequestDto {
  @Transform(transformObjectId)
  @Expose()
  _id: ObjectId;

  @Expose()
  requestedPermission: PermissionLevel;

  @Expose()
  message?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => NodeInfo)
  node: NodeInfo;

  @Expose()
  isRecursive: boolean;

  @Expose()
  @Type(() => RequesterInfo)
  requester: RequesterInfo;
}
