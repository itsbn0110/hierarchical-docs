import { HttpStatus, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../../users/users.service";
import { BusinessException } from "src/common/filters/business.exception";
import { ErrorCode } from "src/common/filters/constants/error-codes.enum";
import { ErrorMessages } from "src/common/filters/constants/messages.constant";
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_ACCESS_SECRET") || "secretKey",
    });
  }

  async validate(payload: { sub: string }) {
    const userId = payload.sub;

    const user = await this.usersService.findUserById(userId);
    if (!user || !user.isActive) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, ErrorMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (user && !user.isActive) {
      throw new BusinessException(ErrorCode.ACCOUNT_DISABLED, ErrorMessages.ACCOUNT_DISABLED, HttpStatus.FORBIDDEN);
    }

    return user;
  }
}
