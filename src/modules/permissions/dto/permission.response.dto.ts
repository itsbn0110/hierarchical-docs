import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { ObjectId } from 'mongodb';
import { PermissionLevel } from 'src/common/enums/projects.enum'; // Điều chỉnh đường dẫn nếu cần
import { transformObjectId } from 'src/common/helpers/transform.helpers'; // Điều chỉnh đường dẫn nếu cần

/**
 * DTO cho đối tượng User lồng bên trong.
 * Chỉ expose những trường cần thiết cho client.
 */
@Exclude()
class PermissionUserDto {
  @Expose()
  @Transform(transformObjectId)
  _id: ObjectId;

  @Expose()
  username: string;

  @Expose()
  email: string;
}

/**
 * DTO chính cho dữ liệu quyền truy cập trả về.
 * Class này định nghĩa cấu trúc dữ liệu cuối cùng mà API sẽ trả về.
 */
@Exclude()
export class PermissionResponseDto {
  @Expose()
  @Transform(transformObjectId)
  _id: ObjectId;

  @Expose()
  permission: PermissionLevel;

  @Expose()
  @Type(() => PermissionUserDto) // Rất quan trọng: Báo cho class-transformer biết cách biến đổi object lồng nhau
  user: PermissionUserDto;
}
