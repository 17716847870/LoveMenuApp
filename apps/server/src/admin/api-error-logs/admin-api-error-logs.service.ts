import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../prisma/prisma.service';
import { RequestWithContext } from '../../common/request-context';
import { AdminAuditService } from '../audit.service';
import { CurrentAdmin } from '../current-admin.decorator';

@Injectable()
export class AdminApiErrorLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AdminAuditService,
  ) {}

  async list(query: { path?: string; status_code?: string; error_name?: string; resolved?: string }) {
    return this.prisma.apiErrorLog.findMany({
      where: {
        path: query.path ? { contains: query.path } : undefined,
        statusCode: query.status_code ? Number(query.status_code) : undefined,
        errorName: query.error_name ? { contains: query.error_name } : undefined,
        isResolved: query.resolved === undefined ? undefined : query.resolved === 'true',
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async get(id: bigint) {
    const log = await this.prisma.apiErrorLog.findUnique({ where: { id } });
    if (!log) {
      throw new NotFoundException('错误日志不存在');
    }
    return log;
  }

  async resolve(id: bigint, admin: CurrentAdmin, request: RequestWithContext) {
    const before = await this.get(id);
    const log = await this.prisma.apiErrorLog.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    });
    await this.auditService.write({
      adminUserId: admin.adminUserId,
      adminUsername: admin.username,
      action: 'api_error.resolve',
      targetType: 'api_error_log',
      targetId: id,
      summary: `标记错误日志已处理：${id.toString()}`,
      before,
      after: log,
      request,
    });
    return log;
  }

  async deleteResolved() {
    return this.prisma.apiErrorLog.deleteMany({
      where: { isResolved: true },
    });
  }

  async deleteExpired() {
    const days = Number(this.configService.get<string>('API_ERROR_LOG_RETENTION_DAYS') ?? 90);
    return this.prisma.apiErrorLog.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        },
      },
    });
  }
}
