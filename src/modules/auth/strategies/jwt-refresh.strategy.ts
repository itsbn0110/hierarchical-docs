import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { BusinessException } from 'src/common/filters/business.exception';
import { ErrorCode } from 'src/common/filters/constants/error-codes.enum';
import { ErrorMessages } from 'src/common/filters/constants/messages.constant';
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'), // Lấy token từ body
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
    });
  }

  async validate(payload: { sub: string }) {
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive || !user.hashedRefreshToken) {
      throw new BusinessException(ErrorCode.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED, 401);
    }
    return user;
  }
}
