import { Exclude, Expose, Transform } from "class-transformer";
import { transformObjectId } from "src/common/helpers/transform.helpers";
import { NodeType } from "src/common/enums/projects.enum";

@Exclude()
export class TrashedItemDto {
  @Expose()
  @Transform(transformObjectId)
  _id: string;

  @Expose()
  name: string;

  @Expose()
  type: NodeType;

  @Expose()
  owner: string; // Thêm trường chủ sở hữu

  @Expose()
  deletedAt: Date;
}
