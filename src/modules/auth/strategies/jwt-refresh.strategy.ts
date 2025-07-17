import { PassportStrategy } from "@nestjs/passport";
import { Strategy, ExtractJwt } from "passport-jwt";
import { Injectable, ForbiddenException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../../users/users.service";
import { Request } from "express";
import * as bcrypt from "bcryptjs";
import { ErrorCode } from "src/common/filters/constants/error-codes.enum";
import { ErrorMessages } from "src/common/filters/constants/messages.constant";
import { BusinessException } from "src/common/filters/business.exception";

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      // Giữ nguyên logic lấy token từ body như file gốc của bạn
      jwtFromRequest: ExtractJwt.fromBodyField("refreshToken"),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_REFRESH_SECRET"),
      // Rất quan trọng: Báo cho strategy biết cần truyền request vào hàm validate
      passReqToCallback: true,
    });
  }

  /**
   * Hàm validate này sẽ được gọi sau khi JWT đã được xác thực chữ ký và chưa hết hạn.
   * @param req - Toàn bộ đối tượng request, chúng ta cần nó để lấy refresh token từ body.
   * @param payload - Payload đã được giải mã từ JWT.
   */
  async validate(req: Request, payload: { sub: string }) {
    // 1. Lấy refresh token từ body của request
    const { refreshToken } = req.body;

    if (!refreshToken) {
       throw new BusinessException(ErrorCode.REFRESH_TOKEN_NOT_FOUND, ErrorMessages.REFRESH_TOKEN_NOT_FOUND, HttpStatus.FORBIDDEN);
    }

    // 2. Tìm người dùng từ payload
    const user = await this.usersService.findUserById(payload.sub);

    // 3. Kiểm tra xem người dùng có tồn tại, active, và có refresh token trong DB không
    if (!user || !user.isActive || !user.hashedRefreshToken) {
      throw new BusinessException(ErrorCode.ACCESS_DENIED, ErrorMessages.ACCESS_DENIED, HttpStatus.FORBIDDEN);
    }

    // 4. So sánh refresh token từ request với token đã hash trong DB
    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.hashedRefreshToken);

    // Nếu không khớp, từ chối
    if (!refreshTokenMatches) {
       throw new BusinessException(ErrorCode.ACCESS_DENIED, ErrorMessages.ACCESS_DENIED, HttpStatus.FORBIDDEN);
    }

    // 5. Nếu mọi thứ hợp lệ, trả về user (loại bỏ các trường nhạy cảm)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hashPassword, hashedRefreshToken, ...result } = user;
    return result;
  }
}
