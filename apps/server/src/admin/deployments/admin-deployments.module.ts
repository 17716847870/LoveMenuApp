import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AdminTokenService } from '../admin-token.service';
import { AdminAuditService } from '../audit.service';
import { AdminSettingsModule } from '../settings/admin-settings.module';
import { AdminDeploymentsController } from './admin-deployments.controller';
import { AdminDeploymentsRealtimeService } from './admin-deployments-realtime.service';
import { AdminDeploymentsService } from './admin-deployments.service';

@Module({
  imports: [PrismaModule, AdminSettingsModule],
  controllers: [AdminDeploymentsController],
  providers: [AdminDeploymentsService, AdminDeploymentsRealtimeService, AdminTokenService, AdminAuditService],
  exports: [AdminDeploymentsRealtimeService],
})
export class AdminDeploymentsModule {}
