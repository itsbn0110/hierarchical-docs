import { Exclude, Expose, Transform } from "class-transformer";
import { transformObjectId } from "src/common/helpers/transform.helpers";
import { NodeType } from "src/common/enums/projects.enum";

@Exclude()
export class RecentItemDto {
  @Expose()
  @Transform(transformObjectId)
  _id: string;

  @Expose()
  name: string;

  @Expose()
  type: NodeType;

  @Expose()
  owner: string;

  @Expose()
  lastAccessedAt: Date;
}
