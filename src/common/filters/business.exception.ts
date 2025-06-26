import { HttpException } from '@nestjs/common';
import { ErrorCode } from './constants/error-codes.enum';

export class BusinessException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    public readonly message: string,
    public readonly httpStatus: number,
  ) {
    const response = {
      message,
      errorCode,
    };
    super(response, httpStatus);
  }
}
