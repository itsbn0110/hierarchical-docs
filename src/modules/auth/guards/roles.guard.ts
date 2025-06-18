import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from 'src/modules/users/types/user-role.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) { // Chỉ cần check user, role sẽ check sau
      throw new ForbiddenException('Bạn không có quyền truy cập');
    }

    // --- CẢI TIẾN 1: BYPASS CHO ROOT ADMIN ---
    if (user.role === UserRole.ROOT_ADMIN) { // Giả sử dùng Enum
      return true;
    }
    // ------------------------------------------

    // --- CẢI TIẾN 2: HỖ TRỢ NHIỀU VAI TRÒ ---
    // Giả sử user.roles là một mảng: ['Editor', 'Viewer']
    const hasRequiredRole = requiredRoles.some((role) => user.roles?.includes(role));
    
    if (!hasRequiredRole) {
      throw new ForbiddenException('Bạn không có quyền truy cập');
    }

    return true;
  }
}