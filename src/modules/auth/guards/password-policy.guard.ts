// src/auth/guards/password-policy.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_CHANGE_PASSWORD_ROUTE_KEY } from '../decorators/change-password.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserRole } from 'src/common/enums/projects.enum';

@Injectable()
export class PasswordPolicyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const isChangePasswordRoute = this.reflector.getAllAndOverride<boolean>(IS_CHANGE_PASSWORD_ROUTE_KEY, [
        context.getHandler(),
        context.getClass(),
    ]);
    
    if (isPublic) return true;

    const { user } = context.switchToHttp().getRequest();

    if (user.role === UserRole.ROOT_ADMIN) return true;

    if (user && user.mustChangePassword && !isChangePasswordRoute) {
      throw new ForbiddenException('Bạn phải đổi mật khẩu trước khi có thể thực hiện các hành động khác.');
    }

    return true;
  }
}