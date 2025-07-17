import { IsEmail, IsNotEmpty, IsString, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { PermissionLevel } from "src/common/enums/projects.enum";

/**
 * DTO cho việc mời người dùng vào một node qua email.
 * Dữ liệu này được gửi từ client đến server.
 */
export class InvitePermissionDto {
  @ApiProperty({
    description: "Email của người dùng cần mời",
    example: "user@example.com",
  })
  @IsEmail({}, { message: "Email không hợp lệ." })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "ID của node (thư mục hoặc file) cần cấp quyền",
    example: "60c72b2f9b1d8c001f8e4b1a",
  })
  @IsString()
  @IsNotEmpty()
  nodeId: string;

  @ApiProperty({
    description: "Cấp độ quyền muốn gán",
    enum: PermissionLevel,
    example: PermissionLevel.VIEWER,
  })
  @IsEnum(PermissionLevel)
  @IsNotEmpty()
  permission: PermissionLevel;
}
