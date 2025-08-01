import { IsMongoId, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationQueryDto } from "./pagination-query-dto";

export class GetNodesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "ID của thư mục cha. Để trống để lấy các node ở cấp gốc.",
    type: String,
  })
  @IsOptional()
  @IsMongoId()
  parentId?: string;
}
