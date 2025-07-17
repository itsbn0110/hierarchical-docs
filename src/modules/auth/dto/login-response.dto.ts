import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { UserResponseDto } from "./user-response.dto";

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: UserResponseDto })
  @Type(() => UserResponseDto)
  user: UserResponseDto;
}
