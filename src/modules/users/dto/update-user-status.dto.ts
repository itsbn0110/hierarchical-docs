import { IsBoolean, IsNotEmpty } from "class-validator";

export class UpdateUserStatusDto {
  @IsBoolean({ message: "Trạng thái phải là true hoặc false" })
  @IsNotEmpty()
  isActive: boolean;
}
