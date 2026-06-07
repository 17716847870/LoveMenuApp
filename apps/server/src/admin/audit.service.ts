import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { getHeaderValue, RequestWithContext } from '../common/request-context';

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

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: {
    adminUserId?: bigint;
    adminUsername?: string;
    action: string;
    targetType?: string;
    targetId?: string | bigint | number;
    summary?: string;
    before?: unknown;
    after?: unknown;
    request?: RequestWithContext;
  }) {
    await this.prisma.adminAuditLog.create({
      data: {
        adminUserId: input.adminUserId,
        adminUsername: input.adminUsername,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId?.toString(),
        summary: input.summary,
        beforeJson: this.sanitize(input.before) as Prisma.InputJsonValue,
        afterJson: this.sanitize(input.after) as Prisma.InputJsonValue,
        ip: input.request?.ip,
        userAgent: getHeaderValue(input.request, 'user-agent'),
        requestId: input.request?.requestId,
      },
    });
  }

  private sanitize(value: unknown): unknown {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

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
}
