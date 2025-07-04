import { transformObjectId } from 'src/common/helpers/transform.helpers';
import { NodeType, PermissionLevel } from 'src/common/enums/projects.enum';
import { Exclude, Expose, Transform } from 'class-transformer';
import { ObjectId } from 'mongodb';

@Exclude()
export class TreeNodeDto {
  @Expose()
  @Transform(transformObjectId)
  id: ObjectId;

  @Expose()
  name: string;

  @Expose()
  type: NodeType;

  @Expose()
  content: string | null;

  @Expose()
  level: number;

  @Expose()
  hasChildren: boolean;

  @Expose()
  userPermission: PermissionLevel | null;

  @Expose()
  createdBy: string;
}
