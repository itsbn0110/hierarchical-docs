// src/search/dto/search-result.dto.ts
import { Exclude, Expose, Transform } from 'class-transformer';
import { ObjectId } from 'mongodb';
import { NodeType, PermissionLevel } from 'src/common/enums/projects.enum';

// Hàm helper quen thuộc của chúng ta
const transformObjectId = ({ value }) => (value instanceof ObjectId ? value.toHexString() : value);

// Định nghĩa các trạng thái truy cập có thể có
export type AccessStatus = PermissionLevel | 'NO_ACCESS';

@Exclude()
export class SearchResultDto {
  @Transform(transformObjectId)
  @Expose()
    nodeId: ObjectId;

  @Expose()
    name: string;

  @Expose()
    type: NodeType;

  // Trạng thái truy cập của người dùng hiện tại trên node này
  @Expose()
    accessStatus: AccessStatus;

  @Expose()
    score?: number;
}
