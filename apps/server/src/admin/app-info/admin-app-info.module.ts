import { Module } from '@nestjs/common';

import { AppInfoModule } from '../../app-info/app-info.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminTokenService } from '../admin-token.service';
import { AdminAuditService } from '../audit.service';
import { AdminAppInfoController } from './admin-app-info.controller';
import { AdminAppInfoService } from './admin-app-info.service';

@Module({
  imports: [AppInfoModule, PrismaModule],
  controllers: [AdminAppInfoController],
  providers: [AdminAppInfoService, AdminTokenService, AdminAuditService],
})
export class AdminAppInfoModule {}
