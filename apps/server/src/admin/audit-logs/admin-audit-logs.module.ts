import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AdminTokenService } from '../admin-token.service';
import { AdminAuditLogsController } from './admin-audit-logs.controller';
import { AdminAuditLogsService } from './admin-audit-logs.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminAuditLogsController],
  providers: [AdminAuditLogsService, AdminTokenService],
})
export class AdminAuditLogsModule {}
