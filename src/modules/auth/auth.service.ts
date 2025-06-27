import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { ObjectId } from 'mongodb';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (
      user &&
      typeof user.hashPassword === 'string' &&
      (await bcrypt.compare(password, user.hashPassword))
    ) {
      return user;
    }
    return null;
  }

  async login(user: User) {
    // 1. Tạo Access Token (hạn ngắn)
    const accessTokenPayload = { username: user.username, sub: user._id, role: user.role };
    const accessToken = this.jwtService.sign(accessTokenPayload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN'),
    });

    // 2. Tạo Refresh Token (hạn dài)
    const refreshTokenPayload = { sub: user._id };
    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
    });

    // 3. Hash và lưu Refresh Token vào database
    await this.usersService.setCurrentRefreshToken(user._id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user, // Trả về user để client có thông tin ban đầu
    };
  }

  async logout(userId: ObjectId) {
    return this.usersService.removeRefreshToken(userId);
  }
}
