import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { ObjectId } from 'mongodb';
import { transformObjectId } from 'src/common/helpers/transform.helpers';
import { NodeType, PermissionLevel } from 'src/common/enums/projects.enum';

// Định nghĩa lại class Ancestor để đảm bảo an toàn
class AncestorDto {
  @Expose()
  @Transform(transformObjectId)
  _id: ObjectId;

  @Expose()
  name: string;
}

// [SỬA] Định nghĩa NodeDetailsDto như một class độc lập, không kế thừa
@Exclude()
export class NodeDetailsDto {
  @Transform(transformObjectId)
  @Expose()
  _id: ObjectId;

  @Expose()
  name: string;

  @Expose()
  type: NodeType;

  @Expose()
  content?: string;

  @Expose()
  @Transform(transformObjectId)
  parentId: ObjectId | null;

  @Expose()
  @Type(() => AncestorDto)
  ancestors: AncestorDto[];

  @Expose()
  level: number;

  // Trường createdBy giờ sẽ là string
  @Expose()
  createdBy: string;

  @Expose()
  userPermission: PermissionLevel | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
