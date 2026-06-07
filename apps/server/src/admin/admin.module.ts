import { Module } from '@nestjs/common';

import { AdminApiErrorLogsModule } from './api-error-logs/admin-api-error-logs.module';
import { AdminAppInfoModule } from './app-info/admin-app-info.module';
import { AdminAppReleasesModule } from './app-releases/admin-app-releases.module';
import { AdminAuditLogsModule } from './audit-logs/admin-audit-logs.module';
import { AdminAuthModule } from './auth/admin-auth.module';
import { AdminDashboardModule } from './dashboard/admin-dashboard.module';
import { AdminDeploymentsModule } from './deployments/admin-deployments.module';
import { AdminSettingsModule } from './settings/admin-settings.module';

@Module({
  imports: [
    AdminApiErrorLogsModule,
    AdminAppInfoModule,
    AdminAppReleasesModule,
    AdminAuditLogsModule,
    AdminAuthModule,
    AdminDashboardModule,
    AdminDeploymentsModule,
    AdminSettingsModule,
  ],
})
export class AdminModule {}
