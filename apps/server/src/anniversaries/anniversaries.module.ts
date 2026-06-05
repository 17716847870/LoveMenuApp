import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnniversariesController } from './anniversaries.controller';
import { AnniversariesService } from './anniversaries.service';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [AnniversariesController],
  providers: [AnniversariesService],
  exports: [AnniversariesService],
})
export class AnniversariesModule {}
