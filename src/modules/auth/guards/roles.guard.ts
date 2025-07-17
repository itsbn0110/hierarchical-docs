import { Injectable, CanActivate, ExecutionContext, HttpStatus } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { UserRole } from "src/common/enums/projects.enum";
import { ErrorMessages } from "src/common/filters/constants/messages.constant";
import { ErrorCode } from "src/common/filters/constants/error-codes.enum";
import { BusinessException } from "src/common/filters/business.exception";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      // Chỉ cần check user, role sẽ check sau
      throw new BusinessException(ErrorCode.ACCESS_DENIED, ErrorMessages.ACCESS_DENIED, HttpStatus.FORBIDDEN);
    }

    if (user.role === UserRole.ROOT_ADMIN) {
      return true;
    }

    const hasRequiredRole = requiredRoles.some((role) => user.role == role);

    if (!hasRequiredRole) {
      throw new BusinessException(ErrorCode.ACCESS_DENIED, ErrorMessages.ACCESS_DENIED, HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
