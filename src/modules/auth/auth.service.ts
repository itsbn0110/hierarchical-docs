import { Injectable, ForbiddenException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import * as bcrypt from "bcryptjs";
import { User } from "../users/entities/user.entity";
import { ConfigService } from "@nestjs/config";
import { ObjectId } from "mongodb";
import { BusinessException } from "src/common/filters/business.exception";
import { ErrorCode } from "src/common/filters/constants/error-codes.enum";
import { ErrorMessages } from "src/common/filters/constants/messages.constant";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Xác thực người dùng bằng email và password.
   * Được gọi bởi LocalStrategy.
   */
  async validateUser(email: string, password: string): Promise<Omit<User, "hashPassword">> {
    const user = await this.usersService.findUserByEmail(email);
    if (user && user.hashPassword && (await bcrypt.compare(password, user.hashPassword))) {
      return user;
    }
    return null;
  }

  /**
   * Xử lý logic sau khi đăng nhập thành công.
   */
  async login(user: User) {
    const tokens = await this.getTokens(user._id, user.username, user.role);
    await this.updateRefreshToken(user._id, tokens.refreshToken);
    return {
      ...tokens,
      user,
    };
  }

  /**
   * Xử lý logic làm mới token.
   */
  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findUserById(userId);

    if (!user || !user.hashedRefreshToken) {
      throw new BusinessException(ErrorCode.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED, 401);
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.hashedRefreshToken);

    if (!refreshTokenMatches) {
      throw new BusinessException(ErrorCode.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED, 401);
    }

    const tokens = await this.getTokens(user._id, user.username, user.role);
    await this.updateRefreshToken(user._id, tokens.refreshToken);

    return tokens;
  }

  /**
   * Xử lý logic đăng xuất.
   */
  async logout(userId: string | ObjectId) {
    await this.usersService.update(new ObjectId(userId), { hashedRefreshToken: null });
  }

  /**
   * Helper: Tạo ra một cặp access và refresh token.
   */
  private async getTokens(userId: ObjectId, username: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          username: username,
          role: role,
        },
        {
          secret: this.configService.get<string>("JWT_ACCESS_SECRET"),
          expiresIn: this.configService.get<string>("JWT_ACCESS_EXPIRES_IN"),
        },
      ),
      this.jwtService.signAsync(
        { sub: userId },
        {
          secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
          expiresIn: this.configService.get<string>("JWT_REFRESH_EXPIRES_IN"),
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Helper: Hash và lưu refresh token mới vào database.
   */
  private async updateRefreshToken(userId: ObjectId, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(userId, {
      hashedRefreshToken,
    });
  }
}
