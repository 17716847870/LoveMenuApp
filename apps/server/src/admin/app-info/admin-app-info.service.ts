import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AppInfoService } from '../../app-info/app-info.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestWithContext } from '../../common/request-context';
import { AdminAuditService } from '../audit.service';
import { CurrentAdmin } from '../current-admin.decorator';

@Injectable()
export class AdminAppInfoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appInfoService: AppInfoService,
    private readonly auditService: AdminAuditService,
  ) {}

  async getAbout() {
    return this.appInfoService.getAbout();
  }

  async updateAbout(payload: Record<string, unknown>, admin: CurrentAdmin, request: RequestWithContext) {
    const before = await this.appInfoService.getAbout();
    const setting = await this.prisma.systemSetting.upsert({
      where: { key: 'app.about' },
      create: {
        key: 'app.about',
        valueJson: payload as Prisma.InputJsonValue,
        description: 'App 关于我们页面配置',
        updatedBy: admin.adminUserId,
      },
      update: {
        valueJson: payload as Prisma.InputJsonValue,
        updatedBy: admin.adminUserId,
      },
    });

    await this.auditService.write({
      adminUserId: admin.adminUserId,
      adminUsername: admin.username,
      action: 'app_info.update_about',
      targetType: 'system_setting',
      targetId: setting.id,
      summary: '修改关于我们配置',
      before,
      after: payload,
      request,
    });

    return this.appInfoService.getAbout();
  }
}
