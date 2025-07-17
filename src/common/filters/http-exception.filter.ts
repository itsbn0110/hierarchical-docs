import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger, HttpException } from "@nestjs/common";
import { Request, Response } from "express";
import { BusinessException } from "./business.exception";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let errorCode: string | undefined;
    let error: string;

    if (exception instanceof BusinessException) {
      const res = exception.getResponse() as { message: string; errorCode: string };
      status = exception.getStatus();
      message = res.message;
      errorCode = res.errorCode;
      error = exception.constructor.name;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      error = exception.name;

      function hasMessage(obj: unknown): obj is { message: string | string[] } {
        return typeof obj === "object" && obj !== null && "message" in obj;
      }

      if (typeof res === "object" && res !== null) {
        if (hasMessage(res)) {
          if (Array.isArray(res.message)) {
            message = res.message.join(". ");
          } else {
            message = res.message || "An error occurred";
          }
        } else {
          message = "An error occurred";
        }
      } else {
        message = typeof res === "string" ? res : JSON.stringify(res);
      }
    }
    // 3. Bắt tất cả các lỗi còn lại (lỗi 500 không lường trước)
    else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      error = "InternalServerError";
      message = "An unexpected internal server error has occurred.";
    }

    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${status} - Error: ${error} - Message: ${message}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    const responseBody = {
      statusCode: status,
      message,
      error,
      errorCode,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(responseBody);
  }
}
