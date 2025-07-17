import { Exclude, Expose, Transform } from "class-transformer";
import { transformObjectId } from "src/common/helpers/transform.helpers";
import { NodeType, PermissionLevel } from "src/common/enums/projects.enum";

@Exclude()
export class SharedNodeDto {
  @Expose()
  @Transform(transformObjectId)
  _id: string;

  @Expose()
  name: string;

  @Expose()
  type: NodeType;

  @Expose()
  yourPermission: PermissionLevel;

  @Expose()
  sharedBy: string;

  @Expose()
  sharedAt: Date;
}
