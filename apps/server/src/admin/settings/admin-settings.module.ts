import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AdminTokenService } from '../admin-token.service';
import { AdminAuditService } from '../audit.service';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminSettingsService } from './admin-settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminSettingsController],
  providers: [AdminSettingsService, AdminTokenService, AdminAuditService],
  exports: [AdminSettingsService],
})
export class AdminSettingsModule {}
