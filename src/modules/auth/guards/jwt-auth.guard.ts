// src/auth/guards/jwt-auth.guard.ts

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  // Ghi đè phương thức canActivate
  canActivate(context: ExecutionContext) {
    // 1. Dùng Reflector để kiểm tra xem có metadata 'isPublic' không
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. Nếu có, tức là route này được đánh dấu @Public() -> Cho qua luôn
    if (isPublic) {
      return true;
    }

    // 3. Nếu không, hãy thực hiện quy trình xác thực JWT như bình thường
    return super.canActivate(context);
  }
}