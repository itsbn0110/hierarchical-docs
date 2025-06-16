import { ExceptionFilter, Catch, ArgumentsHost,HttpStatus,Logger, HttpException } from "@nestjs/common";

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger (GlobalHttpExceptionFilter.name);
  
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'InternalServerError';

    if ( exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = (res as any).message || message;
        error = (res as any).error || error;
      }
    } else if ( exception instanceof Error ) {
      message = exception.message;
      error = exception.name;
    }
    
    this.logger.error(
      `[${request.method}] ${request.url} - ${status} - ${message}`,
      (exception as any)?.stack,
    );
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error,
      message,
    });
  }
}