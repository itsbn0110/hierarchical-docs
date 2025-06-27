import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_CHANGE_PASSWORD_ROUTE_KEY } from '../decorators/change-password.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserRole } from 'src/common/enums/projects.enum';
import { BusinessException } from 'src/common/filters/business.exception';
import { ErrorCode } from 'src/common/filters/constants/error-codes.enum';
import { ErrorMessages } from 'src/common/filters/constants/messages.constant';

@Injectable()
export class PasswordPolicyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const isChangePasswordRoute = this.reflector.getAllAndOverride<boolean>(
      IS_CHANGE_PASSWORD_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) return true;

    const { user } = context.switchToHttp().getRequest();

    if (user.role === UserRole.ROOT_ADMIN) return true;

    if (user && user.mustChangePassword && !isChangePasswordRoute) {
      throw new BusinessException(ErrorCode.ACCESS_DENIED, ErrorMessages.MUST_CHANGE_PASSWORD, 403);
    }

    return true;
  }
}
