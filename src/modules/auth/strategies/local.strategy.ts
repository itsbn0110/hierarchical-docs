import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { HttpStatus, Injectable } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { ErrorMessages } from "src/common/filters/constants/messages.constant";
import { ErrorCode } from "src/common/filters/constants/error-codes.enum";
import { BusinessException } from "src/common/filters/business.exception";
import { UserResponseDto } from "../dto/user-response.dto";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: "email" });
  }
  async validate(email: string, pass: string): Promise<UserResponseDto> {
    const user = await this.authService.validateUser(email, pass);

    if (!user) {
      throw new BusinessException(ErrorCode.LOGIN_FAILED, ErrorMessages.LOGIN_FAILED, HttpStatus.NOT_FOUND);
    }
    if (!user.isActive) {
      throw new BusinessException(ErrorCode.ACCOUNT_DISABLED, ErrorMessages.ACCOUNT_DISABLED, HttpStatus.FORBIDDEN);
    }
    return user;
  }
}
