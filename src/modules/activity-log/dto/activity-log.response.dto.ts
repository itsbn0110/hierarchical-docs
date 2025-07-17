import { Exclude, Expose, Transform, Type } from "class-transformer";
import { transformObjectId } from "src/common/helpers/transform.helpers";
import { ActivityAction } from "src/common/enums/projects.enum";

/**
 * DTO cho đối tượng User lồng trong lịch sử hoạt động.
 */
@Exclude()
class ActivityLogUserDto {
  @Expose()
  @Transform(transformObjectId)
  _id: string;

  @Expose()
  username: string;
}

/**
 * DTO định nghĩa cấu trúc dữ liệu trả về cho API lịch sử hoạt động.
 */
@Exclude()
export class ActivityLogResponseDto {
  @Expose()
  @Transform(transformObjectId)
  _id: string;

  @Expose()
  action: ActivityAction;

  @Expose()
  details: any; // Trường `details` có thể có nhiều cấu trúc khác nhau tùy vào hành động

  @Expose()
  timestamp: Date;

  @Expose()
  @Type(() => ActivityLogUserDto)
  user: ActivityLogUserDto;
}
