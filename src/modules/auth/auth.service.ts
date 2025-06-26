import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { Public } from './decorators/public.decorator';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (user && typeof user.hashPassword === 'string' && await bcrypt.compare(password, user.hashPassword)) {
      return user;
    }
    return null;
  }

  async login(user: User) {
    const payload = { username: user.username, sub: user._id, role: user.role, mustChangePassword: user.mustChangePassword };
    return {
      access_token: this.jwtService.sign(payload)
    };
  }

  // async logout(userId: string) {

  // }
}
