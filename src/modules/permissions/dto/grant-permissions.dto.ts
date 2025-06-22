
import { IsMongoId, IsEnum, IsNotEmpty } from 'class-validator';
import { PermissionLevel } from 'src/common/enums/projects.enum';
export class GrantPermissionDto {
  @IsNotEmpty({ message: 'userId không được để trống.' })
  @IsMongoId({ message: 'userId phải là một ID hợp lệ.' })
  userId: string; // ID của người được nhận quyền

  @IsNotEmpty({ message: 'nodeId không được để trống.' })
  @IsMongoId({ message: 'nodeId phải là một ID hợp lệ.' })
  nodeId: string; // ID của node được gán quyền

  @IsEnum(PermissionLevel, { message: 'Cấp độ quyền không hợp lệ.' })
  permission: PermissionLevel; // Quyền được gán (OWNER, EDITOR, VIEWER)
}