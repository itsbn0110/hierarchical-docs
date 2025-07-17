import { IsMongoId, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class MoveNodeDto {
  /**
   * ID của thư mục cha mới.
   * Gửi `null` nếu muốn di chuyển node ra thư mục gốc.
   */
  @ApiPropertyOptional({
    description: "ID của thư mục đích. Để trống hoặc gửi null để di chuyển ra cấp gốc.",
    example: "6856a1b2c3d4e5f6g7h8i9j0",
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsMongoId({ message: "newParentId phải là một ID hợp lệ." })
  newParentId: string | null;
}
