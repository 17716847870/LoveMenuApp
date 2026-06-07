import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AdminTokenService } from '../admin-token.service';
import { AdminAuditService } from '../audit.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminTokenService, AdminAuditService],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}
