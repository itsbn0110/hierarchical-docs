import { Exclude, Expose, Transform } from 'class-transformer';
import { ObjectId } from 'mongodb';
import { UserRole } from 'src/common/enums/projects.enum';
import { transformObjectId } from 'src/common/helpers/transform.helpers';

@Exclude()
export class UserResponseDto {
  @Expose()
  @Transform(transformObjectId)
    _id: ObjectId;

  @Expose()
    username: string;

  @Expose()
    email: string;

  @Expose()
    role: UserRole;

  @Expose()
    isActive: boolean;
}
