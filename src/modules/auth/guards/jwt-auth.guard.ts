import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { BusinessException } from "src/common/filters/business.exception";
import { ErrorMessages } from "src/common/filters/constants/messages.constant";
import { ErrorCode } from "src/common/filters/constants/error-codes.enum";
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);

    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest(err, user, info: Error) {
    // Nếu token hết hạn, passport-jwt sẽ ném ra lỗi có tên là 'TokenExpiredError'
    if (info?.name === "TokenExpiredError") {
      // Ném ra một HttpException với status code 410 GONE
      throw new BusinessException(ErrorCode.TOKEN_EXPIRED, ErrorMessages.TOKEN_EXPIRED, 410);
    }

    // Nếu có lỗi khác hoặc không có user, gọi lại hàm gốc để nó ném ra lỗi 401 Unauthorized như mặc định
    if (err || !user) {
      throw err || new BusinessException(ErrorCode.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED, 401);
    }

    // Nếu mọi thứ hợp lệ, trả về user
    return user;
  }
}
