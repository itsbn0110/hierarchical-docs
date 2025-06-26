import { Exclude, Expose, Transform } from 'class-transformer';
import { ObjectId } from 'mongodb';
import { NodeType, PermissionLevel } from 'src/common/enums/projects.enum';

const transformObjectId = ({ value }) => (value instanceof ObjectId ? value.toHexString() : value);

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
    level: number;

  @Expose()
    hasChildren: boolean;

  @Expose()
    userPermission: PermissionLevel | null;
}
