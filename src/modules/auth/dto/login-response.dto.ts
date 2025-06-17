import { ApiProperty } from "@nestjs/swagger";
export class LoginResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}
