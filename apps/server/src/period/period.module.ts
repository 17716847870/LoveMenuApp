import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PeriodAiService } from './period-ai.service';
import { PeriodController } from './period.controller';
import { PeriodService } from './period.service';

@Module({
  imports: [AuthModule, PrismaModule, NotificationsModule],
  controllers: [PeriodController],
  providers: [PeriodService, PeriodAiService],
})
export class PeriodModule {}
