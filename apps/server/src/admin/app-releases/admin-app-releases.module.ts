import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AdminTokenService } from '../admin-token.service';
import { AdminAuditService } from '../audit.service';
import { AdminAppReleasesController } from './admin-app-releases.controller';
import { AdminAppReleasesService } from './admin-app-releases.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminAppReleasesController],
  providers: [AdminAppReleasesService, AdminTokenService, AdminAuditService],
})
export class AdminAppReleasesModule {}
