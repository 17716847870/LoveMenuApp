import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { dataResponse } from './api-response';
import { PrismaService } from '../prisma/prisma.service';
import { getHeaderValue, RequestWithContext } from './request-context';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'sms_code',
  'code',
  'phone',
  'new_phone',
  'email',
]);

@Catch()
export class ApiErrorLoggingFilter implements ExceptionFilter {
  constructor(private readonly prisma: PrismaService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithContext>();
    const response = context.getResponse();
    const statusCode = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = this.getMessage(exception);

    if (statusCode >= 500) {
      await this.writeLog(exception, request, statusCode, message).catch((error) => {
        console.error('failed to write api error log', error);
      });
    }

    response.status(statusCode).json(
      dataResponse({
        message,
        statusCode,
        requestId: request.requestId,
      }),
    );
  }

  private async writeLog(exception: unknown, request: RequestWithContext, statusCode: number, message: string) {
    await this.prisma.apiErrorLog.create({
      data: {
        requestId: request.requestId,
        method: request.method,
        path: request.path,
        queryJson: this.sanitize(request.query) as Prisma.InputJsonValue,
        bodyJson: this.sanitize(request.body) as Prisma.InputJsonValue,
        userId: request.user?.userId,
        ip: request.ip,
        userAgent: getHeaderValue(request, 'user-agent'),
        statusCode,
        errorName: exception instanceof Error ? exception.name : typeof exception,
        errorMessage: message,
        errorStack: exception instanceof Error ? exception.stack : undefined,
      },
    });
  }

  private sanitize(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, entryValue]) => [
          key,
          SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : this.sanitize(entryValue),
        ]),
      );
    }

    return value;
  }

  private getMessage(exception: unknown) {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response && 'message' in response) {
        const message = (response as { message: string | string[] }).message;
        return Array.isArray(message) ? message.join(', ') : message;
      }
      return exception.message;
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return '服务器异常';
  }
}
