import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminAuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: { action?: string; target_type?: string }) {
    return this.prisma.adminAuditLog.findMany({
      where: {
        action: query.action ? { contains: query.action } : undefined,
        targetType: query.target_type || undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async get(id: bigint) {
    const log = await this.prisma.adminAuditLog.findUnique({
      where: { id },
    });
    if (!log) {
      throw new NotFoundException('审计日志不存在');
    }
    return log;
  }
}
