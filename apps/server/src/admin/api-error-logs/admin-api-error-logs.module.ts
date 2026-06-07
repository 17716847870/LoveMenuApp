import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AdminTokenService } from '../admin-token.service';
import { AdminAuditService } from '../audit.service';
import { AdminApiErrorLogsController } from './admin-api-error-logs.controller';
import { AdminApiErrorLogsService } from './admin-api-error-logs.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminApiErrorLogsController],
  providers: [AdminApiErrorLogsService, AdminTokenService, AdminAuditService],
})
export class AdminApiErrorLogsModule {}
